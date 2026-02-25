# Destination database

## Purpose

The destinations table backs **Explore universe** and **trip recommendations**. Rows are **major accessible cities/regions** that meet a bar for attractiveness and accessibility (e.g. Taormina, Positano, Cinque Terre — not small towns like Gentilly).

## Column definitions

### Static (stored in DB)

| Column | Type | Description |
|--------|------|-------------|
| `id` | text | Unique slug (e.g. `taormina`, `paris`). |
| `name` | text | Display name. |
| `country` | text | Country name. |
| `region` | text | Continent/region: Europe, Asia, Americas, Africa, Oceania, Middle East. |
| `lat`, `lng` | double | WGS84 coordinates. Used for weather API and distance. |
| `timezone_iana` | text | Optional IANA timezone (e.g. `Europe/Rome`). |
| `transport_modes` | jsonb | Array of typical modes from major hubs: `["flight"]`, `["flight","train"]`, `["flight","ferry"]`. |
| `beauty_score` | 1–5 | Scenery and aesthetic appeal. |
| `culture_score` | 1–5 | Cultural and historical richness. |
| `luxury_score` | 1–5 | High-end / affluent tourism vs mass tourism. |
| `party_score` | 1–5 | Nightlife and energy. |
| `relax_score` | 1–5 | Serenity and relaxation vs busy. |
| `beach_access_score` | 1–5 | Access to beach / coastal quality (1 = none or poor). |
| `food_score` | 1–5 | Food and dining scene. |
| `safety_score` | 1–5 | Safety and kid-friendly. |
| `family_score` | 1–5 | Family-friendly. |
| `priciness_score` | 1–5 | 1 = budget, 5 = splurge. |
| `accessibility_score` | 1–5 | Wheelchair / step-free access (optional). |
| `best_months` | smallint[] | Preferred months to visit (1–12). |

Scores are **curated** from established sources (travel guides, rankings, known indices). No per-row AI.

### Dynamic (computed when user provides input)

- **Distance / travel time / mode**  
  Function of **departure location**. When user provides origin we geocode once (e.g. Nominatim), then compute distance (haversine) and approximate travel time by mode. Cached in `destination_distance_cache` to avoid repeated geocoding.

- **Weather (temp, rain, humidity, UV)**  
  Function of **target travel date range**. When user provides `date_from` / `date_to` we call Open-Meteo Climate API (free) for that range and cache by `(destination_id, year_month)` in `destination_weather_cache`. No API key; rate limits apply.

## Data sources (cost-efficient)

- **Weather**: [Open-Meteo Climate API](https://open-meteo.com/en/docs/climate-api) — free, no key; monthly/daily means by lat/lng and date range.
- **Geocoding** (origin): OpenStreetMap Nominatim (free) or similar, once per origin; then haversine for distance.
- **Scores**: Static curation; optional one-time use of public indices (e.g. Numbeo for cost) or manual assignment from travel guides. No AI for bulk population.

## Granularity

Include destinations that are:

- Well-known and commonly visited.
- Reachable by mainstream transport (flight/train/ferry from a hub).
- Have enough infrastructure and appeal to warrant a row.

Exclude: very small towns, suburbs, or places that are not typical “travel destinations” in their own right.

## API usage

- **GET /api/destinations**  
  Reads from the in-memory list in `lib/destinations.ts` (or from Supabase `destinations` when wired). Optional query params: `origin` (for distance/travel time via geocode + haversine), `date_from` / `date_to` (for weather via Open-Meteo Climate API). No AI; weather and geocode results are cached.
- **POST /api/plan** and **POST /api/plan/destination**  
  Use the same list (by name or id) for trip generation; AI is only used when generating an itinerary, not for listing.

## Current implementation

- **Listing**: The app uses the in-memory `DESTINATIONS` array in `lib/destinations.ts`. It includes 55+ destinations with static scores; newer entries have `lat`, `lng`, `transport_modes`, `relaxScore`, and `beachAccessScore` for full support of distance and weather enrichment.
- **Enrichment**: When the user sets a departure city in Explore, the API geocodes it once (Nominatim), then computes distance and travel time for each destination with coordinates. When the user sets a date range in Explore, the API fetches climate data (Open-Meteo) for that range and caches by month.
- **Supabase**: Run `docs/supabase-schema-destinations.sql` in the Supabase SQL editor to create `destinations`, `destination_weather_cache`, and `destination_distance_cache`. To use the DB as the source of truth, the API would need to query `destinations` and map rows to the same `Destination` shape; the in-memory list can be used as a seed source for inserts.
