alter table public.profiles
  add column if not exists ls_customer_id text,
  add column if not exists ls_subscription_id text,
  add column if not exists ls_subscription_status text;

create index if not exists profiles_ls_subscription_id_idx
  on public.profiles(ls_subscription_id)
  where ls_subscription_id is not null;