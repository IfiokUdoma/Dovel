-- Dovel MVP schema. Apply with: supabase db push
create extension if not exists pgcrypto;

create type public.content_status as enum ('pending','approved','rejected');
create type public.coin_transaction_type as enum ('purchase','episode_unlock','refund','admin_adjustment');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.productions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  synopsis text not null default '',
  genre text not null,
  poster_url text,
  status public.content_status not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  title text not null,
  episode_number integer not null check (episode_number > 0),
  video_url text not null,
  cloudinary_public_id text,
  coin_price integer not null default 0 check (coin_price >= 0),
  is_free boolean not null default false,
  status public.content_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique(production_id, episode_number)
);

create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  type public.coin_transaction_type not null,
  reference text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.episode_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  coins_spent integer not null check (coins_spent >= 0),
  unlocked_at timestamptz not null default now(),
  primary key(user_id, episode_id)
);

create table public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references public.productions(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  admin_id uuid not null references public.profiles(id),
  decision public.content_status not null check (decision in ('approved','rejected')),
  reason text,
  created_at timestamptz not null default now(),
  check ((production_id is not null) <> (episode_id is not null))
);

create table public.watch_history (
  user_id uuid not null references public.profiles(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  progress_seconds integer not null default 0 check (progress_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key(user_id, episode_id)
);

create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  production_id uuid not null references public.productions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, production_id)
);

create index productions_status_created_idx on public.productions(status, created_at desc);
create index episodes_production_idx on public.episodes(production_id, episode_number);
create index coin_transactions_user_idx on public.coin_transactions(user_id, created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and is_admin = true) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, username) values (
    new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'Dovel User')
  );
  insert into public.wallets(user_id, balance) values (new.id, 0);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Atomic unlock: never trust a client-supplied wallet balance or unlock state.
create or replace function public.unlock_episode(p_episode_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_episode public.episodes%rowtype;
  v_balance integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_episode from public.episodes where id = p_episode_id and status = 'approved';
  if not found then raise exception 'Episode unavailable'; end if;
  if v_episode.is_free or v_episode.coin_price = 0 then
    insert into public.episode_unlocks(user_id, episode_id, coins_spent)
    values (v_user, p_episode_id, 0) on conflict do nothing;
    return jsonb_build_object('unlocked', true, 'coins_spent', 0);
  end if;
  if exists(select 1 from public.episode_unlocks where user_id = v_user and episode_id = p_episode_id) then
    return jsonb_build_object('unlocked', true, 'already_unlocked', true);
  end if;
  select balance into v_balance from public.wallets where user_id = v_user for update;
  if coalesce(v_balance, 0) < v_episode.coin_price then
    return jsonb_build_object('unlocked', false, 'insufficient_balance', true, 'required', v_episode.coin_price, 'balance', coalesce(v_balance,0));
  end if;
  update public.wallets set balance = balance - v_episode.coin_price, updated_at = now() where user_id = v_user;
  insert into public.episode_unlocks(user_id, episode_id, coins_spent) values(v_user, p_episode_id, v_episode.coin_price);
  insert into public.coin_transactions(user_id, amount, type, reference, metadata)
  values(v_user, -v_episode.coin_price, 'episode_unlock', 'unlock:' || v_user::text || ':' || p_episode_id::text, jsonb_build_object('episode_id',p_episode_id));
  return jsonb_build_object('unlocked', true, 'coins_spent', v_episode.coin_price);
end;
$$;

alter table public.profiles enable row level security;
alter table public.productions enable row level security;
alter table public.episodes enable row level security;
alter table public.wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.episode_unlocks enable row level security;
alter table public.moderation_logs enable row level security;
alter table public.watch_history enable row level security;
alter table public.likes enable row level security;

create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- Prevent users from changing their own admin flag, even through direct table updates.
revoke update on public.profiles from authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;
create policy "Approved productions are public; creators see own; admins see all" on public.productions for select using (status = 'approved' or creator_id = auth.uid() or public.is_admin());
create policy "Authenticated users submit productions" on public.productions for insert to authenticated with check (creator_id = auth.uid() and status = 'pending');
create policy "Creators edit pending own productions" on public.productions for update to authenticated using (creator_id = auth.uid() and status = 'pending') with check (creator_id = auth.uid() and status = 'pending');
create policy "Admins moderate productions" on public.productions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Approved episodes visible when parent approved; creators and admins see own queue" on public.episodes for select using (
  public.is_admin() or (status = 'approved' and exists(select 1 from public.productions p where p.id = production_id and p.status = 'approved')) or exists(select 1 from public.productions p where p.id = production_id and p.creator_id = auth.uid())
);
create policy "Creators submit episodes to own productions" on public.episodes for insert to authenticated with check (
  status = 'pending' and exists(select 1 from public.productions p where p.id = production_id and p.creator_id = auth.uid())
);
create policy "Admins moderate episodes" on public.episodes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users view own wallet" on public.wallets for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Users view own transactions" on public.coin_transactions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Users view own unlocks" on public.episode_unlocks for select to authenticated using (user_id = auth.uid());
create policy "Admins view moderation logs" on public.moderation_logs for select to authenticated using (public.is_admin());
create policy "Admins write moderation logs" on public.moderation_logs for insert to authenticated with check (public.is_admin() and admin_id = auth.uid());
create policy "Users manage own watch history" on public.watch_history for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Likes are public" on public.likes for select using (true);
create policy "Users manage own likes" on public.likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant execute on function public.unlock_episode(uuid) to authenticated;
