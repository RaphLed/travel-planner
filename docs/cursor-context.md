# Travel Planner — Cursor context

**Single source of truth for project context.** (Do not create a duplicate file with a similar name.)

This is a Next.js 15 App Router project.

## Purpose

Build an AI-powered travel planning platform with:

- AI-generated itineraries
- Editable activity blocks
- Drag-and-drop timeline
- Accessibility-first design
- Future database persistence
- Eventually public deployment

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- OpenAI Responses API (itinerary generation)
- Supabase (trips table: save/load; plan_cache: reduce API calls)
- Unsplash (trip/destination images via `app/api/photo/route.ts`)
- @dnd-kit (drag-and-drop itinerary)

## Key paths

| Role   | Path |
|--------|------|
| UI     | `app/page.tsx` |
| Plan API | `app/api/plan/route.ts` (OpenAI + optional plan_cache) |
| Trips API | `app/api/trips/route.ts`, `app/api/trips/[id]/route.ts` |
| Photo API | `app/api/photo/route.ts` (Unsplash) |
| Copilot API | `app/api/copilot/route.ts` (refine trip via chat) |
| Preferences | `lib/trip-preferences.ts`, `lib/types.ts` |
| DB schema | `docs/supabase-schema.sql` |
| Env example | `.env.example` |

## Current schema

```json
{
  "trip": { "title", "summary", "vibe_tags", "recommended_region", "best_season", "pace" },
  "itinerary": [
    { "day", "base_location", "blocks": [{ "id", "time", "title", "type", "notes" }] }
  ]
}
```

## Goals (priority order)

1. Drag-and-drop itinerary editing
2. Editable activity blocks
3. Save/load trips
4. Multi-trip browsing
5. Eventually deploy publicly

## Constraints

- Clean architecture
- Maintainable code
- Accessibility compliance
- Professional-grade UX

## Implemented

- **Step flow:** Params → Suggestions → Universe. Step 1: full-page parameter selection (large sliders, continuous scales, vibes, days, priciness, travel time, origin, transport, theme, weather, emphasis, constraints). Step 2: after "Find my trips", three trip-idea cards with photos (Unsplash or placeholder), "Enter trip universe" per card. Step 3: cinematic transition then universe view with horizontal chronological timeline.
- **Trip preferences:** Full dimension set; Plan API uses full prefs for prompt and cache. Prompt stresses worldwide, specific, actionable recommendations (no generic fluff).
- **Photos:** `app/api/photo/route.ts` returns Unsplash when `UNSPLASH_ACCESS_KEY` set; otherwise deterministic placeholder so suggestion cards and trip hero always show an image.
- Drag-and-drop itinerary (horizontal timeline: chronological left-to-right; reorder/move blocks between day/time slots; DragOverlay + a11y). Hover on blocks shows title + notes tooltip.
- Editable activity blocks (title, notes, type)
- Save/load trips (Supabase `trips` table; My trips list). Loaded trip opens directly in universe.
- Plan cache (Supabase `plan_cache`; same prefs return cached alternatives)
- Trip universe: horizontal timeline, fine-tune buttons, AI Copilot panel. Back to suggestions → “Your trip universe” when coming from suggestions list.
- Visuals: editorial palette (CSS variables), hero-with-mesh, suggestion-card styles, cinematic overlay when selecting a trip
- Single context file: `docs/cursor-context.md` only

## Next steps (priority)

- Multi-trip browsing / dashboard
- Auth (e.g. Supabase Auth) to scope trips to users
- Monetization hooks (e.g. sponsored slots, affiliate links) — see `docs/vision-and-quality.md`

