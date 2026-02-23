# Architecture (current)

## Overview

- **Frontend:** Next.js App Router. Single main page at `app/page.tsx` (client component). App and API live under `app/`.
- **Backend:** Next.js API routes: `app/api/plan/route.ts` (generate itinerary), `app/api/copilot/route.ts` (refine trip via chat), `app/api/trips/*` (save/load), `app/api/photo/route.ts` (Unsplash).
- **AI:** OpenAI called only from API routes (never from the browser). Keys in env.
- **State:** Itinerary and trip data in React state; preferences (vibes, days, priciness, origin, transport, constraints, emphasis, theme, weather) in state; optional Supabase for persistence and plan cache.

## Data flow

1. User sets **trip preferences**: vibes, days; optionally “Add more detail” (priciness, origin, max travel time, transport, constraints, emphasis, theme, weather). Clicks **Find my trips**.
2. Client `POST`s to `/api/plan` with full preferences. API hashes preferences for cache; on cache miss calls OpenAI (worldwide, specific, actionable prompt); returns `{ alternatives: [PlanResponse, …] }` (3 alternatives).
3. **Suggestions step:** Client shows three trip-idea cards (photo via `/api/photo` or placeholder). User picks one, clicks **Enter trip universe** → cinematic overlay → **Universe step**.
4. **Universe step:** Selected trip with hero image, metadata, **horizontal chronological timeline** (Day 1 AM/PM/Eve, Day 2 …). Drag-and-drop between slots; hover shows block details; inline edit. Fine-tune and **AI Copilot** call `/api/copilot`; optional revised plan merged. "Back to suggestions" returns to step 3.
5. Save/Load use `/api/trips` (Supabase). Loaded trip opens in universe. Plan cache reduces repeat OpenAI calls for same preferences.

## Conventions

- Shared types in `lib/types.ts` (Block, Day, PlanResponse) and `lib/trip-preferences.ts` (TripPreferences, defaults, options). APIs and page import from these.
- All user-facing copy in the app; no i18n yet.
