insert into public.profiles (id, email, display_name, generation_count_reset_at)
select
  users.id,
  coalesce(users.email, ''),
  coalesce(
    users.raw_user_meta_data ->> 'display_name',
    users.raw_user_meta_data ->> 'full_name',
    users.raw_user_meta_data ->> 'name'
  ),
  date_trunc('day', now() at time zone 'utc') at time zone 'utc' + interval '1 day'
from auth.users as users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
)
on conflict (id) do nothing;

create or replace function public.ensure_own_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles;
  claims jsonb := auth.jwt();
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, email, display_name, generation_count_reset_at)
  values (
    auth.uid(),
    coalesce(nullif(claims ->> 'email', ''), ''),
    coalesce(
      claims #>> '{user_metadata,display_name}',
      claims #>> '{user_metadata,full_name}',
      claims #>> '{user_metadata,name}'
    ),
    date_trunc('day', now() at time zone 'utc') at time zone 'utc' + interval '1 day'
  )
  on conflict (id) do update
    set email = case
          when public.profiles.email = '' then excluded.email
          else public.profiles.email
        end,
        display_name = coalesce(public.profiles.display_name, excluded.display_name)
  returning * into profile_row;

  return profile_row;
end;
$$;

revoke all on function public.ensure_own_profile() from public;
grant execute on function public.ensure_own_profile() to authenticated;