-- Run this in the Supabase SQL Editor after creating a project.
-- Travel Planner: trips storage and optional plan cache for fewer API calls.

-- Trips: saved itineraries (and later: link to user_id when auth is added)
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null,
  -- optional: when you add auth, add user_id uuid references auth.users(id)
  -- and enable RLS so users only see their own trips
);

create index if not exists trips_created_at_idx on public.trips (created_at desc);

-- Optional: cache AI-generated plans by input hash to reduce OpenAI calls.
-- TTL: you can add a cron job to delete rows where created_at < now() - interval '7 days'.
create table if not exists public.plan_cache (
  id uuid primary key default gen_random_uuid(),
  input_hash text not null unique,
  vibes text not null,
  days int not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists plan_cache_input_hash_idx on public.plan_cache (input_hash);

-- Allow anonymous read/write for development (tighten with RLS when you add auth).
alter table public.trips enable row level security;
alter table public.plan_cache enable row level security;

create policy "Allow all for trips" on public.trips for all using (true) with check (true);
create policy "Allow all for plan_cache" on public.plan_cache for all using (true) with check (true);
