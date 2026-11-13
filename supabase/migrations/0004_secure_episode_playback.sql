-- Protect paid video URLs from direct public table reads.
drop policy if exists "Approved episodes visible when parent approved; creators and admins see own queue" on public.episodes;
create policy "Creators and admins view episode submissions" on public.episodes
for select using (
  public.is_admin() or exists(
    select 1 from public.productions p
    where p.id = production_id and p.creator_id = auth.uid()
  )
);

create or replace function public.get_public_episodes(p_production_id uuid)
returns table(id uuid,title text,episode_number integer,coin_price integer,is_free boolean)
language sql stable security definer set search_path = public
as $$
  select e.id,e.title,e.episode_number,e.coin_price,e.is_free
  from public.episodes e
  join public.productions p on p.id=e.production_id
  where e.production_id=p_production_id
    and e.status='approved' and p.status='approved'
  order by e.episode_number asc;
$$;

create or replace function public.get_episode_playback(p_episode_id uuid)
returns table(video_url text,title text,episode_number integer)
language plpgsql stable security definer set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in to watch episodes'; end if;
  return query
    select e.video_url,e.title,e.episode_number
    from public.episodes e
    join public.productions p on p.id=e.production_id
    where e.id=p_episode_id
      and e.status='approved' and p.status='approved'
      and (
        e.is_free or e.coin_price=0
        or exists(select 1 from public.episode_unlocks u where u.episode_id=e.id and u.user_id=v_user)
      );
  if not found then raise exception 'Episode is not unlocked or unavailable'; end if;
end;
$$;

revoke all on function public.get_public_episodes(uuid) from public;
revoke all on function public.get_episode_playback(uuid) from public;
grant execute on function public.get_public_episodes(uuid) to anon,authenticated;
grant execute on function public.get_episode_playback(uuid) to authenticated;

-- Also ensure the unlock RPC cannot unlock content whose parent is not approved.
create or replace function public.unlock_episode(p_episode_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_episode public.episodes%rowtype;
  v_balance integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select e.* into v_episode
  from public.episodes e
  join public.productions p on p.id=e.production_id
  where e.id=p_episode_id and e.status='approved' and p.status='approved';
  if not found then raise exception 'Episode unavailable'; end if;
  if v_episode.is_free or v_episode.coin_price=0 then
    insert into public.episode_unlocks(user_id,episode_id,coins_spent)
    values(v_user,p_episode_id,0) on conflict do nothing;
    return jsonb_build_object('unlocked',true,'coins_spent',0);
  end if;
  if exists(select 1 from public.episode_unlocks where user_id=v_user and episode_id=p_episode_id) then
    return jsonb_build_object('unlocked',true,'already_unlocked',true);
  end if;
  select balance into v_balance from public.wallets where user_id=v_user for update;
  if coalesce(v_balance,0)<v_episode.coin_price then
    return jsonb_build_object('unlocked',false,'insufficient_balance',true,'required',v_episode.coin_price,'balance',coalesce(v_balance,0));
  end if;
  update public.wallets set balance=balance-v_episode.coin_price,updated_at=now() where user_id=v_user;
  insert into public.episode_unlocks(user_id,episode_id,coins_spent) values(v_user,p_episode_id,v_episode.coin_price);
  insert into public.coin_transactions(user_id,amount,type,reference,metadata)
  values(v_user,-v_episode.coin_price,'episode_unlock','unlock:'||v_user::text||':'||p_episode_id::text,jsonb_build_object('episode_id',p_episode_id));
  return jsonb_build_object('unlocked',true,'coins_spent',v_episode.coin_price);
end;
$$;
