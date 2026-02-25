-- Run after supabase-schema.sql and supabase-schema-auth-and-share.sql.
-- Destinations table: major accessible cities for Explore and trip recommendations.
-- Static columns only; distance/travel and weather are computed at request time when user provides origin and dates.

-- Destinations: one row per destination (city/region that "makes the cut" — e.g. Taormina, not Gentilly).
create table if not exists public.destinations (
  id text primary key,
  name text not null,
  country text not null,
  region text not null,
  lat double precision not null,
  lng double precision not null,
  timezone_iana text,
  -- Transport: which modes typically reach this destination from major hubs (stored as JSON array: ["flight","train","ferry"]).
  transport_modes jsonb not null default '["flight"]',
  -- Qualitative scores 1–5 (curated; sources: travel guides, rankings, not per-request AI).
  beauty_score smallint not null check (beauty_score between 1 and 5),
  culture_score smallint not null check (culture_score between 1 and 5),
  luxury_score smallint not null check (luxury_score between 1 and 5),
  party_score smallint not null check (party_score between 1 and 5),
  relax_score smallint not null check (relax_score between 1 and 5),
  beach_access_score smallint not null default 1 check (beach_access_score between 1 and 5),
  food_score smallint not null check (food_score between 1 and 5),
  safety_score smallint not null check (safety_score between 1 and 5),
  family_score smallint not null check (family_score between 1 and 5),
  priciness_score smallint not null check (priciness_score between 1 and 5),
  accessibility_score smallint,
  -- Best months to visit (1–12), optional.
  best_months smallint[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists destinations_region_idx on public.destinations (region);
create index if not exists destinations_country_idx on public.destinations (country);
create index if not exists destinations_priciness_idx on public.destinations (priciness_score);
create index if not exists destinations_safety_idx on public.destinations (safety_score);

-- Cache for weather by destination and month (avoids repeated Open-Meteo calls).
-- Populated when user provides date range; key = destination_id + first month of range.
create table if not exists public.destination_weather_cache (
  id uuid primary key default gen_random_uuid(),
  destination_id text not null references public.destinations(id) on delete cascade,
  year_month text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique(destination_id, year_month)
);

create index if not exists destination_weather_cache_lookup on public.destination_weather_cache (destination_id, year_month);

-- Optional: cache for origin→destination distance/travel (when user provides origin).
-- Key = hash(origin_place + destination_id) or (origin_lat, origin_lng, destination_id).
-- TTL: 7 days; then recompute. Reduces geocoding + distance calls.
create table if not exists public.destination_distance_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  distance_km double precision,
  travel_time_hours double precision,
  travel_mode text,
  created_at timestamptz not null default now()
);

create index if not exists destination_distance_cache_key_idx on public.destination_distance_cache (cache_key);

alter table public.destinations enable row level security;
alter table public.destination_weather_cache enable row level security;
alter table public.destination_distance_cache enable row level security;

create policy "Allow read destinations" on public.destinations for select using (true);
create policy "Allow read weather cache" on public.destination_weather_cache for select using (true);
create policy "Allow read distance cache" on public.destination_distance_cache for select using (true);
-- Write to caches from API (service role or anon with RLS that allows insert/update for cache tables).
create policy "Allow all weather cache" on public.destination_weather_cache for all using (true) with check (true);
create policy "Allow all distance cache" on public.destination_distance_cache for all using (true) with check (true);
