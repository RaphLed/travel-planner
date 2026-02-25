# Travel Planner

AI-powered trip planning: set your preferences, get three trip ideas, then step into **your trip universe** to refine one with drag-and-drop and an **AI Copilot**.

## Features

- **Params:** Full-page form — vibes, duration, budget, origin, travel time, transport, theme, weather, emphasis, constraints. One action: **Find my trips**.
- **Suggestions:** Three trip-idea cards (with images). Pick one → **Enter trip universe** (short cinematic).
- **Universe:** Horizontal timeline (Day 1 AM/PM/Eve, …), drag-and-drop, inline edit, hover details. **More/Less expensive** and **AI Copilot** to refine. **Save / Load** and **My trips** (sign in optional). **Share** trip via link (Viewer or Editor); recipients open `/share/[token]`.

## Tech stack

Next.js 15 (App Router), TypeScript, Tailwind CSS, OpenAI, Supabase, Unsplash, @dnd-kit.

## Getting started

1. `npm install`
2. Copy `.env.example` to `.env.local`. Set `OPENAI_API_KEY`. Optional: Supabase URL + anon key (save/load + auth); run `docs/supabase-schema.sql` then `docs/supabase-schema-auth-and-share.sql`, enable Email auth. For share links set `SUPABASE_SERVICE_ROLE_KEY`. Optional: `docs/supabase-schema-destinations.sql` for destinations table and weather/distance caches. Optional: `UNSPLASH_ACCESS_KEY`, `NEXT_PUBLIC_APP_URL`.
3. `npm run dev` → [http://localhost:3000](http://localhost:3000)

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/architecture.md](docs/architecture.md) | System design, stack, data flow, conventions (single technical reference) |
| [docs/changelog.md](docs/changelog.md) | Chronological change history (append-only) |
| [docs/cursor-context.md](docs/cursor-context.md) | Entry point for contributors / AI (paths, current state) |
| [docs/DESTINATION_DATABASE.md](docs/DESTINATION_DATABASE.md) | Destinations table, static vs dynamic columns, data sources, API usage |
| [docs/how-it-works.md](docs/how-it-works.md) | User journey in plain language |
| [docs/vision-and-quality.md](docs/vision-and-quality.md) | Product vision and quality bar |

Deploy to Vercel or any Next.js host; set the same env vars.
