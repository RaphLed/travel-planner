# Travel Planner — Development log

Chronological audit trail of features, fixes, and decisions.

---

## 2026-02-23

- **Drag-and-drop UX and a11y:** Added `DragOverlay` so the dragged activity block follows the cursor as a floating preview (no “ghost” left in the list). Wired `defaultScreenReaderInstructions` into `DndContext` for keyboard and screen-reader users. Docs: `docs/how-it-works.md`, `docs/stack.md`, `docs/cursor-context.md` updated to describe DragOverlay and a11y.

---

## 2026-02-22

- Created Next.js app scaffold; Git initialized.
- Connected OpenAI API: `POST /api/plan` accepts `vibes` (string) and `days` (number), returns trip + itinerary (trip metadata + day/block structure).
- Built itinerary UI: single page with trip input (vibes, duration), generate button, and output section showing trip header and day cards with Morning/Afternoon/Evening blocks.
- Added project context doc: `docs/cursor-context.md` (canonical; removed duplicate `cursos-context.md`).
- **Checkpoint commit** before drag-and-drop and doc overhaul.
- Doc overhaul:
  - `docs/cursor-context.md`: canonical Cursor/project context (and path reference).
  - `docs/vision-and-quality.md`: product vision, design bar (Apple + Condé Nast Traveller), prompt quality, future dimensions.
  - `docs/how-it-works.md`: flowcharts and narrative for explaining the site (for demos and onboarding).
  - Updated `docs/architecture.md`, `docs/stack.md` for accuracy and audit trail.
- **API fix:** `app/api/plan/route.ts` now returns the parsed AI response: uses `response.output_text`, handles `response.error`, empty output, and parse errors; returns JSON `{ trip, itinerary }` with proper status codes.
- **Next (immediate):** Implement drag-and-drop itinerary timeline with `@dnd-kit` (sortable blocks within/between days and time slots; state in `plan.itinerary`).

- **Context consolidation:** Removed duplicate `docs/cursos-context.md`; `docs/cursor-context.md` is the single project context file.
- **Database (Supabase):** Added `lib/supabase.ts`, `app/api/trips/route.ts` (GET list, POST save), `app/api/trips/[id]/route.ts` (GET one, PATCH). Schema in `docs/supabase-schema.sql`: `trips` (id, created_at, updated_at, payload jsonb), `plan_cache` (input_hash, vibes, days, payload). Plan API checks cache by hash(vibes, days) before calling OpenAI and upserts result into `plan_cache` to reduce API calls. UI: Save this trip, My trips list, Load trip by id. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; see `.env.example`.
- **Visuals:** Editorial palette in `app/globals.css` (CSS variables: background, foreground, muted, accent, card, border; light/dark). Page and components use `var(--…)` for theming. Hero image for trip: `app/api/photo/route.ts` (GET ?q=) calls Unsplash API (server-side `UNSPLASH_ACCESS_KEY`), returns { url, alt }; frontend shows image above trip title with Unsplash attribution.
- **Trip universe:** Framed the post-generate flow as “Your trip universe”: section heading and copy (“Elaborate, tweak, and mold your trip below. Drag activities between days and time slots; click to edit.”). Same drag-and-drop and inline editing as before, now clearly labeled as the universe step.
- **Docs:** Updated `docs/how-it-works.md` (user journey, system flow, app structure, data shape) for cache, trips API, photo API, trip universe. Updated `docs/cursor-context.md` (stack, paths, implemented vs next steps). Layout metadata: title “Travel Planner”, description updated.
