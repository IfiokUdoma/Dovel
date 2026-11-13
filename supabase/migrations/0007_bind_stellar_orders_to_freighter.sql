-- Bind new Stellar payment orders to the connected Freighter account.
-- Existing orders remain readable; NULL is retained for legacy orders created before wallet binding.
alter table public.stellar_payment_orders
  add column payer_public_key text;

alter table public.stellar_payment_orders
  add constraint stellar_payment_orders_payer_public_key_format
  check (payer_public_key is null or payer_public_key ~ '^G[A-Z2-7]{55}$');

create index stellar_payment_orders_payer_public_key_idx
  on public.stellar_payment_orders(payer_public_key)
  where payer_public_key is not null;
