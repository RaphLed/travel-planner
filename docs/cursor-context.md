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

- **Trip preferences:** Vibes + days; "Add more detail" for priciness, origin, max travel time, transport, constraints, emphasis, theme, weather. Plan API uses full prefs for prompt and cache.
- Drag-and-drop itinerary (reorder/move blocks between days and time slots; DragOverlay + defaultScreenReaderInstructions for a11y)
- Editable activity blocks (title, notes, type)
- Save/load trips (Supabase `trips` table; My trips list)
- Plan cache (Supabase `plan_cache`; same vibes+days returns cached plan, fewer OpenAI calls)
- Trip universe (fine-tune + AI Copilot): suggested itinerary → “Your trip universe” section to elaborate/tweak with drag-and-drop
- Visuals: editorial palette (CSS variables), hero image from Unsplash per trip
- Single context file: `docs/cursor-context.md` only (duplicate `cursos-context.md` removed)

## Next steps (priority)

- Multi-trip browsing / dashboard
- Auth (e.g. Supabase Auth) to scope trips to users
- Monetization hooks (e.g. sponsored slots, affiliate links) — see `docs/vision-and-quality.md`

