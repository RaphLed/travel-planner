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

## Next step: drag-and-drop itinerary

1. **Install** `@dnd-kit/core`, `@dnd-kit/sortable` (and optionally `@dnd-kit/utilities`).
2. **Wrap** the itinerary output in `DndContext`; use droppable ids like `day-${day}-${time}` (e.g. `day-1-morning`).
3. **Make each block** a draggable/sortable item (e.g. `useSortable` with block `id`); each time slot (Morning/Afternoon/Evening) is a `SortableContext` + droppable zone.
4. **On drag end:** resolve `active.id` (block id) and `over` (target zone or item); update `plan.itinerary` immutably (move block to new day/time and index); keep block `id`, update `time` as needed.
5. **Accessibility:** rely on dnd-kit’s keyboard and screen-reader support; ensure droppable zones have clear labels (e.g. "Day 1, Morning").
6. **Scope:** client-only state updates; no persistence or API for order yet. See `docs/how-it-works.md` for data flow and `docs/vision-and-quality.md` for design bar.
