# Tech stack

| Layer      | Choice |
|-----------|--------|
| Framework | Next.js 15 (App Router) |
| Language  | TypeScript |
| Styling   | Tailwind CSS |
| AI        | OpenAI API (Responses API, `json_object` for itinerary) |
| DnD | @dnd-kit (core + sortable + DragOverlay, screen reader instructions) |
| Version control | Git |
| Editor    | Cursor |

## Design direction

- **Aesthetic:** Apple-like clarity and restraint, mixed with Condé Nast Traveller — refined, inspiring, not tacky. Smooth interactions and cursors.
- **Audience:** Travellers brainstorming and exploring; goal is a popular everyday tool.
- **Quality bar:** Itineraries must be genuinely enticing; prompts are structured so the model returns clear, fit-for-purpose suggestions.

## Future (not in use yet)

- Database (e.g. Postgres via Supabase or Neon) for save/load.
- Auth (e.g. Clerk or Supabase Auth).
- External data: places, weather, photos (licensed, e.g. Unsplash/Pexels), accessibility where available.
