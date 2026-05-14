create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  stripe_customer_id text,
  stripe_subscription_id text,
  generation_count_today integer not null default 0,
  generation_count_reset_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.presentations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  audience text,
  target_duration text,
  total_duration text,
  status text not null default 'draft' check (status in ('draft', 'generated', 'edited', 'exported')),
  prompt_version integer not null default 1,
  tips jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations(id) on delete cascade,
  position integer not null,
  title text not null,
  emotion text not null check (emotion in ('hook', 'empathy', 'build', 'reveal', 'proof', 'close')),
  duration_seconds integer not null default 60,
  slide_heading text,
  slide_bullets jsonb not null default '[]'::jsonb,
  script text not null default '',
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations(id) on delete cascade,
  filename text not null,
  file_path text not null,
  file_size integer,
  extracted_text text,
  chunks jsonb not null default '[]'::jsonb,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations(id) on delete cascade,
  format text not null check (format in ('pptx', 'pdf', 'md')),
  file_path text not null,
  signed_url text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists presentations_user_id_idx on public.presentations(user_id);
create index if not exists moments_presentation_id_idx on public.moments(presentation_id);
create index if not exists source_documents_presentation_id_idx on public.source_documents(presentation_id);
create index if not exists agent_conversations_presentation_id_idx on public.agent_conversations(presentation_id);
create index if not exists exports_presentation_id_idx on public.exports(presentation_id);

alter table public.profiles enable row level security;
alter table public.presentations enable row level security;
alter table public.moments enable row level security;
alter table public.source_documents enable row level security;
alter table public.agent_conversations enable row level security;
alter table public.exports enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own"
  on public.profiles for delete
  using (id = auth.uid());

drop policy if exists "presentations_select_own" on public.presentations;
drop policy if exists "presentations_insert_own" on public.presentations;
drop policy if exists "presentations_update_own" on public.presentations;
drop policy if exists "presentations_delete_own" on public.presentations;

create policy "presentations_select_own"
  on public.presentations for select
  using (user_id = auth.uid());

create policy "presentations_insert_own"
  on public.presentations for insert
  with check (user_id = auth.uid());

create policy "presentations_update_own"
  on public.presentations for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "presentations_delete_own"
  on public.presentations for delete
  using (user_id = auth.uid());

drop policy if exists "moments_select_own" on public.moments;
drop policy if exists "moments_insert_own" on public.moments;
drop policy if exists "moments_update_own" on public.moments;
drop policy if exists "moments_delete_own" on public.moments;

create policy "moments_select_own"
  on public.moments for select
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = moments.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "moments_insert_own"
  on public.moments for insert
  with check (
    exists (
      select 1 from public.presentations
      where presentations.id = moments.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "moments_update_own"
  on public.moments for update
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = moments.presentation_id
        and presentations.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.presentations
      where presentations.id = moments.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "moments_delete_own"
  on public.moments for delete
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = moments.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

drop policy if exists "source_documents_select_own" on public.source_documents;
drop policy if exists "source_documents_insert_own" on public.source_documents;
drop policy if exists "source_documents_update_own" on public.source_documents;
drop policy if exists "source_documents_delete_own" on public.source_documents;

create policy "source_documents_select_own"
  on public.source_documents for select
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = source_documents.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "source_documents_insert_own"
  on public.source_documents for insert
  with check (
    exists (
      select 1 from public.presentations
      where presentations.id = source_documents.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "source_documents_update_own"
  on public.source_documents for update
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = source_documents.presentation_id
        and presentations.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.presentations
      where presentations.id = source_documents.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "source_documents_delete_own"
  on public.source_documents for delete
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = source_documents.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

drop policy if exists "agent_conversations_select_own" on public.agent_conversations;
drop policy if exists "agent_conversations_insert_own" on public.agent_conversations;
drop policy if exists "agent_conversations_update_own" on public.agent_conversations;
drop policy if exists "agent_conversations_delete_own" on public.agent_conversations;

create policy "agent_conversations_select_own"
  on public.agent_conversations for select
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = agent_conversations.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "agent_conversations_insert_own"
  on public.agent_conversations for insert
  with check (
    exists (
      select 1 from public.presentations
      where presentations.id = agent_conversations.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "agent_conversations_update_own"
  on public.agent_conversations for update
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = agent_conversations.presentation_id
        and presentations.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.presentations
      where presentations.id = agent_conversations.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "agent_conversations_delete_own"
  on public.agent_conversations for delete
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = agent_conversations.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

drop policy if exists "exports_select_own" on public.exports;
drop policy if exists "exports_insert_own" on public.exports;
drop policy if exists "exports_update_own" on public.exports;
drop policy if exists "exports_delete_own" on public.exports;

create policy "exports_select_own"
  on public.exports for select
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = exports.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "exports_insert_own"
  on public.exports for insert
  with check (
    exists (
      select 1 from public.presentations
      where presentations.id = exports.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "exports_update_own"
  on public.exports for update
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = exports.presentation_id
        and presentations.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.presentations
      where presentations.id = exports.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create policy "exports_delete_own"
  on public.exports for delete
  using (
    exists (
      select 1 from public.presentations
      where presentations.id = exports.presentation_id
        and presentations.user_id = auth.uid()
    )
  );

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_presentations_updated_at on public.presentations;
create trigger set_presentations_updated_at
  before update on public.presentations
  for each row execute function public.set_updated_at();

drop trigger if exists set_moments_updated_at on public.moments;
create trigger set_moments_updated_at
  before update on public.moments
  for each row execute function public.set_updated_at();

drop trigger if exists set_agent_conversations_updated_at on public.agent_conversations;
create trigger set_agent_conversations_updated_at
  before update on public.agent_conversations
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, generation_count_reset_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    date_trunc('day', now() at time zone 'utc') at time zone 'utc' + interval '1 day'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
begin
  if exists (select 1 from cron.job where jobname = 'reset_generation_count_today_midnight_utc') then
    perform cron.unschedule('reset_generation_count_today_midnight_utc');
  end if;
end;
$$;

select cron.schedule(
  'reset_generation_count_today_midnight_utc',
  '0 0 * * *',
  $$
  update public.profiles
  set generation_count_today = 0,
      generation_count_reset_at = now();
  $$
);