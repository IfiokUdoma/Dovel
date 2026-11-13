-- Paystack coin purchases. Only server-side service-role code may create or settle orders.
create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reference text not null unique,
  amount_kobo integer not null check (amount_kobo > 0),
  coins integer not null check (coins > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  paystack_transaction_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index payment_orders_user_created_idx on public.payment_orders(user_id, created_at desc);
alter table public.payment_orders enable row level security;
create policy "Users view own payment orders" on public.payment_orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.payment_orders from anon, authenticated;

create or replace function public.credit_coin_purchase(
  p_reference text,
  p_transaction_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  select * into v_order
  from public.payment_orders
  where reference = p_reference
  for update;

  if not found then raise exception 'Payment order not found'; end if;

  if v_order.status = 'paid' then
    return jsonb_build_object('credited', false, 'already_paid', true);
  end if;

  if v_order.status <> 'pending' then
    raise exception 'Payment order is not pending';
  end if;

  update public.wallets
  set balance = balance + v_order.coins, updated_at = now()
  where user_id = v_order.user_id;

  if not found then raise exception 'Wallet not found'; end if;

  insert into public.coin_transactions(user_id, amount, type, reference, metadata)
  values (
    v_order.user_id,
    v_order.coins,
    'purchase',
    'paystack:' || v_order.reference,
    jsonb_build_object('provider','paystack','amount_kobo',v_order.amount_kobo,'currency',v_order.currency,'transaction_id',p_transaction_id)
  );

  update public.payment_orders
  set status = 'paid', paystack_transaction_id = p_transaction_id, paid_at = now()
  where id = v_order.id;

  return jsonb_build_object('credited', true, 'coins', v_order.coins);
end;
$$;

revoke all on function public.credit_coin_purchase(text,text) from public, anon, authenticated;
grant execute on function public.credit_coin_purchase(text,text) to service_role;
