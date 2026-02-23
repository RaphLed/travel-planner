# Travel Planner

AI-powered trip planning: set your preferences, generate an itinerary, then step into **your trip universe** to refine it with drag-and-drop and an optional **AI copilot**.

## Features

- **Trip input:** Vibes and duration (days). Toggle **Add more detail** for:
  - Priciness (Budget → Splurge)
  - Origin (city/country)
  - Max travel time (hours)
  - Preferred transport (flight, train, car, mixed, ferry)
  - Constraints (e.g. wheelchair, dietary)
  - Emphasis (culture, history, fun, relax, adventure, food, nature, nightlife)
  - Theme (wedding, stag do, girls weekend, honeymoon, family, solo)
  - Weather preference
- **Generate itinerary:** One click; same preferences are cached to reduce API calls.
- **Trip universe:** After generation, refine your trip:
  - Drag activities between days and time slots (Morning / Afternoon / Evening).
  - Edit title, notes, and activity type inline.
  - **More expensive** / **Less expensive** to nudge the plan.
  - **AI Copilot:** side panel with suggestion chips and chat to request changes (e.g. “Add 2 museums”, “Wheelchair-accessible only”); the copilot can return an updated plan.
- **Save / Load:** Persist trips (Supabase). **My trips** lists saved itineraries.

## Tech stack

- **Next.js** (App Router), **TypeScript**, **Tailwind CSS**
- **OpenAI** (itinerary generation + copilot)
- **Supabase** (trips table + plan cache)
- **Unsplash** (trip hero images, server-side)
- **@dnd-kit** (accessible drag-and-drop)

## Getting started

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`.
   - **Required:** `OPENAI_API_KEY` (for generation and copilot).
   - **Optional:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (save/load + plan cache). Run `docs/supabase-schema.sql` in the Supabase SQL Editor.
   - **Optional:** `UNSPLASH_ACCESS_KEY` (trip hero images).

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Docs

- **`docs/how-it-works.md`** — User journey, system flow, app structure (with Mermaid diagrams).
- **`docs/cursor-context.md`** — Project context and next steps.
- **`docs/architecture.md`** — Data flow and conventions.
- **`docs/stack.md`** — Stack and design direction.
- **`docs/dev-log.md`** — Development log.

## Deploy

You can deploy to [Vercel](https://vercel.com) or any Next.js host. Set the same env vars in the dashboard.
