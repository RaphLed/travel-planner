# Architecture (current)

## Overview

- **Frontend:** Next.js App Router. Single main page at `app/page.tsx` (client component). No `src/` — app and API live under `app/`.
- **Backend:** Next.js API route `app/api/plan/route.ts`. No database yet.
- **AI:** OpenAI called only from the API route (never from the browser). API key in `OPENAI_API_KEY` env.
- **State:** Itinerary and trip data live in React state on the client; no persistence yet.

## Data flow

1. User enters vibes + days and clicks **Generate itinerary**.
2. Client `POST`s to `/api/plan` with `{ vibes, days }`.
3. API validates env and body, calls OpenAI (Responses API, `json_object` output), parses response.
4. API returns JSON `{ trip, itinerary }` to the client.
5. Client sets `plan` state and renders trip header + day cards; each day has three time blocks (Morning / Afternoon / Evening) with activity blocks.
6. Drag-and-drop updates `plan.itinerary` in place (reorder / move blocks between days and time slots). Uses @dnd-kit/core and @dnd-kit/sortable; each time slot is a droppable zone; each block is sortable.

## Conventions

- Types for `Block`, `Day`, `PlanResponse` are defined in `app/page.tsx`; consider moving to a shared types module when adding API reuse or persistence.
- All user-facing copy and structure are in the app; no i18n yet.
