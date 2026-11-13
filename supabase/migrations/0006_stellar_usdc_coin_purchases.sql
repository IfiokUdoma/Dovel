-- Stellar USDC coin purchases. Keep the legacy Paystack migration and records intact for audit history.
create table public.stellar_payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  memo text not null unique,
  asset_code text not null check (asset_code = 'USDC'),
  asset_issuer text not null,
  amount numeric(20,7) not null check (amount > 0),
  coins integer not null check (coins > 0),
  status text not null default 'pending' check (status in ('pending','paid','expired')),
  transaction_hash text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index stellar_payment_orders_user_created_idx on public.stellar_payment_orders(user_id, created_at desc);
alter table public.stellar_payment_orders enable row level security;
create policy "Users view own Stellar payment orders" on public.stellar_payment_orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.stellar_payment_orders from anon, authenticated;

create or replace function public.credit_stellar_coin_purchase(p_memo text, p_transaction_hash text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_order public.stellar_payment_orders%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  select * into v_order from public.stellar_payment_orders where memo = p_memo for update;
  if not found then raise exception 'Payment order not found'; end if;
  if v_order.status = 'paid' then return jsonb_build_object('credited', false, 'already_paid', true); end if;
  if v_order.status <> 'pending' then raise exception 'Payment order is not pending'; end if;
  if exists(select 1 from public.stellar_payment_orders where transaction_hash = p_transaction_hash) then raise exception 'Transaction already used'; end if;
  update public.wallets set balance = balance + v_order.coins, updated_at = now() where user_id = v_order.user_id;
  if not found then raise exception 'Wallet not found'; end if;
  insert into public.coin_transactions(user_id, amount, type, reference, metadata)
  values(v_order.user_id, v_order.coins, 'purchase', 'stellar:' || p_transaction_hash,
    jsonb_build_object('provider','stellar','asset',v_order.asset_code,'amount',v_order.amount,'transaction_hash',p_transaction_hash,'memo',v_order.memo));
  update public.stellar_payment_orders set status='paid', transaction_hash=p_transaction_hash, paid_at=now() where id=v_order.id;
  return jsonb_build_object('credited', true, 'coins', v_order.coins);
end;
$$;
revoke all on function public.credit_stellar_coin_purchase(text,text) from public, anon, authenticated;
grant execute on function public.credit_stellar_coin_purchase(text,text) to service_role;
