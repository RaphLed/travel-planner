# Travel Planner — project context

**Entry point for contributors and AI.** For full technical detail use [architecture.md](./architecture.md); for change history use [changelog.md](./changelog.md); for product vision use [vision-and-quality.md](./vision-and-quality.md).

- **What it is:** Next.js 15 App Router app. AI-generated trip alternatives → user picks one → trip universe (timeline, drag-and-drop, AI Copilot, save/load).
- **Stack:** Next.js, TypeScript, Tailwind, OpenAI, Supabase, Unsplash, @dnd-kit. See [architecture.md](./architecture.md) §3–4 for paths and stack table.

## Key paths

| Role     | Path |
|----------|------|
| UI       | `app/page.tsx` |
| Plan     | `app/api/plan/route.ts` |
| Photo    | `app/api/photo/route.ts` |
| Copilot  | `app/api/copilot/route.ts` |
| Trips    | `app/api/trips/route.ts`, `app/api/trips/[id]/route.ts` |
| Destinations | `lib/destinations.ts`, `app/api/destinations/route.ts`, `app/api/plan/destination/route.ts` |
| Block alternatives | `app/api/block-alternatives/route.ts` |
| Types    | `lib/types.ts`, `lib/trip-preferences.ts` |
| DB schema| `docs/supabase-schema.sql` |

## Current data shape

- Plan API returns `{ alternatives: PlanResponse[] }` (3). Each **PlanResponse**: `{ trip: { title, summary, vibe_tags, recommended_region, best_season, pace }, itinerary: Day[] }`. **Day**: `{ day, base_location, blocks }`. **Block**: `{ id, time, title, type, notes }`.

## Implemented

- Step flow (Params → Suggestions → Universe); luxury visual system; full-page params with trip story; 3 suggestion cards (destination first, title italic); cinematic entry; universe: one day per column, Timeline | Calendar, activity filter, Google Maps link, hints, Copilot; save/load; plan cache; photo fallback.
- **Auth (optional):** Supabase Auth via @supabase/ssr; Sign in / Create account in header; trips scoped by user_id; “Sign in to save and share trips” when not logged in.
- **Sharing:** Share trip (after save) via link; Viewer (read-only) or Editor (inline edit on /share/[token], Save changes). Share links table; GET/PATCH by token (service role).
- **Explore universes:** Destinations database (cities + KPIs: travel time, temp, rain, beauty/culture/party/safety/luxury/priciness). `GET /api/destinations` filters by prefs (maxTravelTimeHours, maxPriciness, travelMode), sortable. “Explore universes” / “Or explore universes” opens table; “Enter trip universe” on a row calls `POST /api/plan/destination` (single-destination itinerary) and goes to universe.
- **Block alternatives:** On universe timeline, each activity block has “Swap”: `POST /api/block-alternatives` (location, type, currentTitle) returns AI-suggested alternatives (e.g. top museums in Paris); user picks one to replace the block title/notes.

## Next (priority)

- Multi-trip dashboard; email delivery of share link (optional); optional monetization (see vision-and-quality.md).

## Constraints

- Clean architecture; accessibility; professional UX. No duplicate context docs; single source of truth for technical content is [architecture.md](./architecture.md).
