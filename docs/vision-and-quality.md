# Vision and quality bar

## Product goal

A beautifully designed interface that smoothly accompanies travellers in **brainstorming and exploration** of potential trips, with an **intuitive journey development tool**, anchored on **factual, up-to-date data** about the relative attractiveness of destinations according to user criteria.

Target: eventually release as a **very popular everyday tool**.

## Design direction

- **Apple:** Clarity, restraint, smooth motion. Cursors and interactions should feel sleek and intentional, not tacky.
- **Condé Nast Traveller:** Refined, inspiring, editorial quality. The product should feel like a trusted travel companion, not a generic booking UI.

## User dimensions (current and planned)

**Current:** Vibes (free text) + duration (days).

**Planned expansion (from MVP vision):**

- Travel dates (optional), budget band
- Vibe sliders: culture ↔ party, nature ↔ city, relax ↔ adventure
- Weather preference
- Accessibility needs (mobility, sensory, neurodiversity-friendly)
- Output: ranked “trip universes” with “why this fits you” and photos/map preview

Design the data model and API so these dimensions can be added without breaking existing flows.

## Itinerary quality

- Proposed itineraries must be **actual amazing trip ideas** — enticing and plausible.
- **Pre-structure or write the queries** sent to the OpenAI API so the model gets clear instructions on the type of suggestions we want.
- Prompt engineering: specify format (trip + itinerary schema), pacing rules, block types (food, nature, culture, etc.), and tone (practical notes, inspiring but realistic). Iterate on prompts and, if needed, add few-shot examples or a “trip brain” service that reranks/explains.

## Trust and compliance

- Photos: use only APIs with clear licensing (e.g. Unsplash, Pexels) and store attribution.
- Accessibility recommendations: support preferences and constraints; avoid implying medical certainty; provide verification links and “confirm with venues/operators” where relevant.
- Sponsored or affiliate content: clearly labeled and non-intrusive when introduced.
