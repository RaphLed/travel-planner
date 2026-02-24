-- Phase 2: Auth and sharing. Run after supabase-schema.sql.
-- Requires Supabase Auth to be enabled in the project.

-- 1. Add user_id to trips (nullable during migration; then require for new rows in app)
alter table public.trips
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists trips_user_id_idx on public.trips (user_id);

-- 2. RLS: users can only access their own trips
drop policy if exists "Allow all for trips" on public.trips;
create policy "Users can manage own trips"
  on public.trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Share links: token-based access for view/edit
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token text not null unique,
  email text,
  role text not null default 'viewer' check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now()
);

create index if not exists share_links_token_idx on public.share_links (token);
create index if not exists share_links_trip_id_idx on public.share_links (trip_id);

alter table public.share_links enable row level security;

-- Only trip owner can create share links (enforced in API via service role or auth.uid())
create policy "Users can manage share_links for own trips"
  on public.share_links for all
  using (
    exists (
      select 1 from public.trips t
      where t.id = share_links.trip_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = share_links.trip_id and t.user_id = auth.uid()
    )
  );

-- 4. Service role is used in API for GET/PATCH by token (no RLS bypass needed if we use a Postgres function, but simpler: use service role in app for share routes only).
-- No additional policy for anonymous token access; the API will use service role key to read share_links and trips by token.
