# Travel Planner — Development log

Chronological audit trail of features, fixes, and decisions.

---

## 2026-02-22

- Created Next.js app scaffold; Git initialized.
- Connected OpenAI API: `POST /api/plan` accepts `vibes` (string) and `days` (number), returns trip + itinerary (trip metadata + day/block structure).
- Built itinerary UI: single page with trip input (vibes, duration), generate button, and output section showing trip header and day cards with Morning/Afternoon/Evening blocks.
- Added project context docs: `docs/cursos-context.md` (and `docs/cursor-context.md`).
- **Checkpoint commit** before drag-and-drop and doc overhaul.
- Doc overhaul:
  - `docs/cursor-context.md`: canonical Cursor/project context (and path reference).
  - `docs/vision-and-quality.md`: product vision, design bar (Apple + Condé Nast Traveller), prompt quality, future dimensions.
  - `docs/how-it-works.md`: flowcharts and narrative for explaining the site (for demos and onboarding).
  - Updated `docs/architecture.md`, `docs/stack.md` for accuracy and audit trail.
- **API fix:** `app/api/plan/route.ts` now returns the parsed AI response: uses `response.output_text`, handles `response.error`, empty output, and parse errors; returns JSON `{ trip, itinerary }` with proper status codes.
- **Next (immediate):** Implement drag-and-drop itinerary timeline with `@dnd-kit` (sortable blocks within/between days and time slots; state in `plan.itinerary`).
