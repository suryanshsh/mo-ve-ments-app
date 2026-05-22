alter table public.profiles
  add column if not exists ls_subscription_updated_at timestamptz;

revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "profiles_update_display_name_own" on public.profiles;

create policy "profiles_update_display_name_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'text/markdown'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documents_storage_select_own" on storage.objects;
drop policy if exists "documents_storage_insert_own" on storage.objects;
drop policy if exists "documents_storage_update_own" on storage.objects;
drop policy if exists "documents_storage_delete_own" on storage.objects;

create policy "documents_storage_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and name like auth.uid()::text || '/%'
  );

create policy "documents_storage_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and name like auth.uid()::text || '/%'
  );

create policy "documents_storage_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and name like auth.uid()::text || '/%'
  )
  with check (
    bucket_id = 'documents'
    and name like auth.uid()::text || '/%'
  );

create policy "documents_storage_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and name like auth.uid()::text || '/%'
  );

drop function if exists public.batch_update_moment_positions(jsonb);

create or replace function public.batch_update_moment_positions(p_user_id uuid, p_updates jsonb)
returns setof public.moments
language plpgsql
set search_path = public
as $$
declare
  update_item jsonb;
  updated_moment public.moments;
  updated_moments public.moments[] := array[]::public.moments[];
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Not authorized to reorder moments';
  end if;

  if jsonb_typeof(p_updates) <> 'array' then
    raise exception 'p_updates must be a JSON array';
  end if;

  for update_item in select value from jsonb_array_elements(p_updates)
  loop
    update public.moments
    set position = (update_item ->> 'position')::integer,
        updated_at = now()
    where id = (update_item ->> 'id')::uuid
      and exists (
        select 1
        from public.presentations
        where presentations.id = moments.presentation_id
          and presentations.user_id = p_user_id
      )
    returning * into updated_moment;

    if not found then
      raise exception 'Moment % not found or not editable', update_item ->> 'id';
    end if;

    updated_moments := array_append(updated_moments, updated_moment);
  end loop;

  return query
    select (moment_row).*
    from unnest(updated_moments) as moment_row
    order by (moment_row).position;
end;
$$;

create table if not exists public.lemon_squeezy_webhook_events (
  event_id text primary key,
  event_name text,
  subscription_id text,
  payload_created_at timestamptz,
  processed_at timestamptz not null default now()
);

create index if not exists lemon_squeezy_webhook_events_subscription_id_idx
  on public.lemon_squeezy_webhook_events(subscription_id)
  where subscription_id is not null;

alter table public.lemon_squeezy_webhook_events enable row level security;

drop policy if exists "lemon_webhook_events_no_user_access" on public.lemon_squeezy_webhook_events;
create policy "lemon_webhook_events_no_user_access"
  on public.lemon_squeezy_webhook_events
  for all
  using (false)
  with check (false);

create or replace function public.enforce_presentation_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_plan text;
  presentation_count integer;
  plan_limit integer;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Presentation owner mismatch';
  end if;

  select plan into current_plan
  from public.profiles
  where id = new.user_id;

  plan_limit := case current_plan
    when 'pro' then 999
    when 'team' then 999
    else 2
  end;

  select count(*) into presentation_count
  from public.presentations
  where user_id = new.user_id;

  if presentation_count >= plan_limit then
    raise exception 'Presentation plan limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_presentation_plan_limit on public.presentations;
create trigger enforce_presentation_plan_limit
  before insert on public.presentations
  for each row execute function public.enforce_presentation_plan_limit();

alter table public.source_documents
  add constraint source_documents_file_size_limit
  check (file_size is null or file_size <= 10485760) not valid,
  add constraint source_documents_extracted_text_limit
  check (extracted_text is null or length(extracted_text) <= 50000) not valid,
  add constraint source_documents_chunks_limit
  check (
    case
      when jsonb_typeof(chunks) = 'array' then jsonb_array_length(chunks) <= 100
      else false
    end
  ) not valid;