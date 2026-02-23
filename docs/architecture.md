# Architecture (current)

## Overview

- **Frontend:** Next.js App Router. Single main page at `app/page.tsx` (client component). App and API live under `app/`.
- **Backend:** Next.js API routes: `app/api/plan/route.ts` (generate itinerary), `app/api/copilot/route.ts` (refine trip via chat), `app/api/trips/*` (save/load), `app/api/photo/route.ts` (Unsplash).
- **AI:** OpenAI called only from API routes (never from the browser). Keys in env.
- **State:** Itinerary and trip data in React state; preferences (vibes, days, priciness, origin, transport, constraints, emphasis, theme, weather) in state; optional Supabase for persistence and plan cache.

## Data flow

1. User sets **trip preferences**: vibes, days; optionally “Add more detail” (priciness, origin, max travel time, transport, constraints, emphasis, theme, weather). Clicks **Generate itinerary**.
2. Client `POST`s to `/api/plan` with full preferences. API hashes preferences for cache; on cache miss calls OpenAI with a rich prompt, then caches and returns `{ trip, itinerary }`.
3. Client shows suggested itinerary (hero image optional) and **Your trip universe**: day cards with Morning/Afternoon/Evening blocks, drag-and-drop (@dnd-kit), inline edit (title, notes, type). Fine-tune buttons (More/Less expensive) and **AI Copilot** panel send messages to `/api/copilot`; optional revised plan is merged into state.
4. Save/Load use `/api/trips` (Supabase). Plan cache reduces repeat OpenAI calls for same preferences.

## Conventions

- Shared types in `lib/types.ts` (Block, Day, PlanResponse) and `lib/trip-preferences.ts` (TripPreferences, defaults, options). APIs and page import from these.
- All user-facing copy in the app; no i18n yet.
