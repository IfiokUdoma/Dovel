-- Episode moderation and creator-visible rejection feedback.
alter table public.episodes
  add column if not exists rejection_reason text;

create or replace function public.moderate_episode(
  p_episode_id uuid,
  p_decision public.content_status,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'Invalid moderation decision';
  end if;
  if p_decision = 'rejected' and coalesce(trim(p_reason), '') = '' then
    raise exception 'A rejection reason is required';
  end if;

  update public.episodes
  set status = p_decision,
      rejection_reason = case when p_decision = 'rejected' then trim(p_reason) else null end
  where id = p_episode_id and status = 'pending';

  if not found then
    raise exception 'Episode not found or no longer pending';
  end if;

  insert into public.moderation_logs(episode_id, admin_id, decision, reason)
  values (p_episode_id, auth.uid(), p_decision,
    case when p_decision = 'rejected' then trim(p_reason) else null end);
end;
$$;

revoke all on function public.moderate_episode(uuid, public.content_status, text) from public;
grant execute on function public.moderate_episode(uuid, public.content_status, text) to authenticated;
