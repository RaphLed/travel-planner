# Travel Planner — Cursor context

**Canonical project context.** (Also maintained as `cursos-context.md`.)

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

- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI Responses API
- Local development currently

## Key paths

| Role   | Path (logical; app lives in `app/`, not `src/app/`) |
|--------|------------------------------------------------------|
| API    | `app/api/plan/route.ts`                              |
| UI     | `app/page.tsx`                                      |

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

## Next step: save/load trips

Drag-and-drop itinerary and editable activity blocks are implemented. Each activity block can be dragged between days and time slots (Morning/Afternoon/Evening); title, notes, and type are editable inline. State updates in the browser only.

Next: save/load trips (persistence). See `docs/how-it-works.md` for data flow and `docs/vision-and-quality.md` for design bar.

