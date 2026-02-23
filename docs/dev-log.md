# Travel Planner — Development log

Chronological audit trail of features, fixes, and decisions.

---

## 2026-02-22 (UX overhaul)

- **Step flow:** Three steps: Params → Suggestions → Universe. Params: full-page "Design your trip" with large sliders (days 1–60, priciness 1–5, max travel 1–24h), vibes textarea, origin, transport, theme, weather, emphasis chips, constraints. Only after "Find my trips" does the user see the next page (suggestions).
- **Suggestions page:** Three trip-idea cards with image (photo API or placeholder), title, region, summary, vibe tags, "Enter trip universe". "Change parameters" returns to params. Photos: `/api/photo` now returns a deterministic placeholder (picsum.photos seed) when Unsplash is unconfigured or returns nothing, so images always show.
- **Cinematic:** On "Enter trip universe", a full-screen overlay ("Entering trip universe…" + progress bar) plays ~1.4s, then the universe view is shown.
- **Horizontal timeline:** Universe view shows the itinerary on a horizontal chronological axis (Day 1 AM, PM, Eve, Day 2 AM, …) with overflow-x scroll. Same drag-and-drop and sortable blocks; hover on a block shows tooltip (title + notes).
- **API prompt:** Plan API prompt and system message updated for worldwide, specific, actionable trip recommendations (real places and activities; no generic fluff).
- **Docs:** `docs/cursor-context.md` and `docs/architecture.md` updated for step flow, timeline, photo fallback, and prompt.

---

## 2026-02-23 (continued)

- **Trip preferences and “Add more detail”:** Added full dimension set for trip input. Default view: vibes + days. Toggle **Add more detail** reveals: priciness (1–5 slider, Budget → Splurge), origin (text), max travel time (1–24h slider), transport (any/flight/train/car/mixed/ferry), constraints (text, e.g. wheelchair, dietary), emphasis (multi-select chips: culture, history, fun, relax, adventure, food, nature, nightlife), theme (none/wedding/stag do/girls weekend/honeymoon/family/solo), weather (any/warm/cool/avoid rain/sunny). Shared types and defaults in `lib/trip-preferences.ts`; `lib/types.ts` holds Block, Day, PlanResponse. Plan API (`app/api/plan/route.ts`) accepts full preferences, builds a rich prompt, and uses `hash(JSON.stringify(prefs))` for plan cache.
- **AI Copilot:** New route `app/api/copilot/route.ts`: POST `{ plan, message }` → OpenAI returns `{ reply, plan? }`; optional revised plan is merged on the client. UI: optional side panel (slide from right) when in trip universe, with pre-written suggestion chips (e.g. “Add 2 museums”, “Less expensive options”, “Wheelchair-accessible only”) and a chat input. User can click a chip or type; assistant reply and optional plan update are applied.
- **Trip universe feel:** Trip universe section wrapped in a distinct container (border, bg) with fine-tune buttons **More expensive** / **Less expensive** (call copilot with that instruction) and **AI Copilot** toggle. Copy and layout emphasize “elaborate, tweak, and mold” once inside the universe.
- **Docs:** Updated `docs/architecture.md` (data flow, preferences, copilot), `docs/stack.md` (dimensions, DB, photos), `docs/how-it-works.md` (user journey, sequence diagram, app structure for preferences and copilot). New **README.md** (features, stack, getting started, docs pointers).

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
