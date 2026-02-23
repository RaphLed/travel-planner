# Tech stack

| Layer      | Choice |
|-----------|--------|
| Framework | Next.js 15 (App Router) |
| Language  | TypeScript |
| Styling   | Tailwind CSS (CSS variables for theme) |
| AI        | OpenAI API (Responses API: plan generation, copilot refinements) |
| DnD       | @dnd-kit (core + sortable + DragOverlay, a11y) |
| DB        | Supabase (trips, plan_cache) |
| Photos    | Unsplash (server-side via `/api/photo`) |
| Version control | Git |
| Editor    | Cursor |

## Design direction

- **Aesthetic:** Apple-like clarity and restraint, mixed with Condé Nast Traveller — refined, inspiring, not tacky. Smooth interactions.
- **Audience:** Travellers brainstorming and exploring; goal is a popular everyday tool.
- **Quality bar:** Itineraries must be genuinely enticing; prompts use full preferences (priciness, origin, transport, constraints, emphasis, theme, weather).

## Key dimensions (trip input)

- Vibes, duration (days), priciness (slider), origin, max travel time, transport mode, constraints (e.g. wheelchair), emphasis (culture/history/fun/relax/adventure/food/nature), theme (wedding/stag/girls weekend/honeymoon/family/solo), weather. “Add more detail” toggle reveals full options.
