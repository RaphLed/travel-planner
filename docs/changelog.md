# Changelog

Append-only, chronological record of changes (oldest first). Add new entries at the **bottom**.

---

## Project start

- Next.js app scaffold; Git initialized.
- `POST /api/plan` with vibes + days; returns `{ trip, itinerary }`. Basic UI: trip input, generate, day cards (Morning/Afternoon/Evening).
- `docs/cursor-context.md` as single context doc; duplicate removed.
- API fix: plan route uses `response.output_text`, error handling, returns JSON `{ trip, itinerary }`.

---

## Persistence and visuals

- Supabase: `lib/supabase.ts`, `app/api/trips` (GET list, POST save), `app/api/trips/[id]` (GET, PATCH). Schema: `docs/supabase-schema.sql` (trips, plan_cache). Plan API caches by hash(prefs); UI: Save, My trips, Load.
- Editorial palette in `app/globals.css` (CSS variables); hero image via `app/api/photo/route.ts` (Unsplash). “Your trip universe” framing and copy.

---

## Drag-and-drop and accessibility

- @dnd-kit: sortable blocks within/between days and time slots. DragOverlay for drag preview; defaultScreenReaderInstructions for a11y.

---

## Preferences and Copilot

- Full trip preferences: vibes, days, priciness, origin, max travel time, transport, constraints, emphasis, theme, weather. Types in `lib/trip-preferences.ts`; plan API uses full prefs and hash for cache.
- `app/api/copilot/route.ts`: POST `{ plan, message }` → `{ reply, plan? }`. UI: Copilot panel (chips + chat), fine-tune buttons (More/Less expensive).

---

## Step flow and suggestions

- Three steps: Params → Suggestions → Universe. Params: full-page “Design your trip” (sliders, vibes, origin, transport, theme, weather, emphasis, constraints), CTA “Find my trips”. Suggestions: 3 trip cards (image, title, region, summary, “Enter trip universe”); “Change parameters” back to Params. Universe: selected trip, timeline, Copilot, Save/Load; “Back to suggestions” without re-fetch.
- Plan API returns `{ alternatives: PlanResponse[] }` (3); cache stores alternatives.

---

## Photos and prompt

- Photo API: deterministic placeholder when Unsplash unset or no result; suggestion cards and hero always show an image.
- Plan prompt: worldwide, specific, actionable recommendations (no generic fluff).

---

## Universe UX

- Cinematic overlay on “Enter trip universe” (~1.4s). Horizontal chronological timeline (Day 1 AM/PM/Eve, …); overflow-x scroll; hover tooltips (title + notes) on blocks.

---

## Documentation consolidation

- Single technical reference: `docs/architecture.md` (diagrams, stack, paths, data flow, data shape, conventions). Stack and key paths merged from former separate docs.
- Single history: `docs/changelog.md` (this file); `docs/dev-log.md` and `docs/audit-trail.md` retired.
- `docs/cursor-context.md` slimmed to entry point for AI/contributors; `docs/how-it-works.md` to short user-journey explainer. `docs/vision-and-quality.md` retained for product vision and quality bar.

---

## Luxury UX and universe overhaul

- **Visual system:** Restrained, high-end palette (neutrals, minimal frames, no tacky colour). Light default (warm off-white, charcoal accent); dark mode supported. Thin range sliders (`.range-luxury`), understated borders.
- **Landing (params):** Vast, smooth layout; granular sliders (step 1, clear value labels); bottom section “Your trip in a few words” (trip story / vibe / preferences) sent to plan API and prompt.
- **Destination first:** Suggestion cards and universe header show **location (country/region) first**, catchy title below in italic. Plan API and copy prioritise clear destination naming.
- **Universe layout:** One **day per column**, steps of the day stacked **vertically** (Morning → Afternoon → Evening), calendar-inspired. Softer, modular styling; less rigid boxes.
- **Map:** “Open in Google Maps” link built from itinerary (base locations + block titles as waypoints). User can copy link or open in new tab.
- **Calendar view:** Toggle Timeline | Calendar; calendar shows one card per day (base location, step count) for a different perspective.
- **Activity filter:** Filter timeline by activity type (food, nature, culture, etc.) to reduce density.
- **Hints:** Gentle reminders: on suggestions “You can change parameters anytime with the button above”; in universe “Drag to reorder · Click to edit · Or ask the AI Copilot to add, remove, or change any item.”
- **Copilot:** Placeholder and copy emphasise adding/removing/amending items by typing (e.g. “Add Louvre on Day 2”, “Remove the beach afternoon”); drag-and-drop retained.

---

## Phase 2: Auth and sharing

- **Supabase Auth:** @supabase/ssr for Next.js; browser client (`lib/supabase/client.ts`) and server client (`lib/supabase/server.ts`); middleware to refresh session. Sign in / Create account (email + password) in header; optional—users can skip and use the app without an account.
- **Trips scoped by user:** `trips` table has `user_id` (RLS: users can only access their own trips). GET/POST /api/trips use server client and require auth for save; GET returns [] when not logged in. Plan cache unchanged (anon).
- **Share links:** Table `share_links` (trip_id, token, email, role: viewer|editor). POST /api/trips/[id]/share creates a link; GET/PATCH /api/share/[token] use service role to read/update trip by token. Share modal: email (optional), Viewer/Editor, copy link. Recipients open /share/[token]: view-only or editable (inline edit title/notes, Save changes).
- **UI:** Header shows Sign in / Create account or user email + Sign out. Universe sidebar: “Sign in to save and share trips” when not logged in; when logged in, Save, Share trip (after save), My trips. 401 on save opens sign-in modal.
- **Schema:** `docs/supabase-schema-auth-and-share.sql` (run after main schema). Env: SUPABASE_SERVICE_ROLE_KEY, optional NEXT_PUBLIC_APP_URL.

---

## Explore universes and block alternatives

- **Destinations database:** `lib/destinations.ts` defines `Destination` (name, country, travelTimeHours, travelMode, avgTempC, avgRainfallMm, avgHumidityPct, avgUvIndex, beauty/culture/party/safety/luxury/priciness scores). Static list of 24 cities (Europe + a few beyond) with mock KPIs. `GET /api/destinations` accepts maxTravelTimeHours, maxPriciness, travelMode, sortBy, sortOrder; returns filtered and sorted list.
- **Single-destination itinerary:** `POST /api/plan/destination` accepts `{ destination: string, prefs }`; returns one `PlanResponse` for that city (OpenAI, same schema as plan alternatives).
- **Explore universes UI:** Params page: “Or explore universes” goes to suggestions step and opens the table. Suggestions step: “Explore universes” button opens a modal with a sortable table (City, Country, Travel h, °C, Rain, Beauty, Culture, Price, Action). “Enter trip universe” on a row generates an itinerary for that destination and switches to universe. Table is pre-filtered by current prefs (max travel time, priciness, transport).
- **Block alternatives:** `POST /api/block-alternatives` accepts `{ location, type, currentTitle? }`; returns 6–8 alternative venues (title, notes, rating) for that activity type in that location (OpenAI). Universe timeline: each activity block has a “Swap” button; opens modal with alternatives; selecting one updates the block title/notes.
