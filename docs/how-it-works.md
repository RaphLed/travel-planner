# How the Travel Planner works

This doc helps you explain the site to others: **what it does** and **how it’s built**, with flowcharts you can view in any Mermaid-supported viewer (e.g. GitHub, VS Code, or [mermaid.live](https://mermaid.live)).

---

## 1. User journey (what the user sees)

```mermaid
flowchart LR
  A[Vibes + days] --> B[Optional: Add more detail]
  B --> C[Priciness, origin, transport, constraints, emphasis, theme, weather]
  C --> D[Generate itinerary]
  D --> E[Suggested itinerary + hero image]
  E --> F[Enter trip universe]
  F --> G[Drag / edit blocks]
  G --> H[Fine-tune: More or Less expensive]
  H --> I[AI Copilot: suggestions + chat]
  I --> J[Save / Load from My trips]
```

**In words:** The user sets vibes and days; they can toggle **Add more detail** to set priciness (slider), origin, max travel time, transport, constraints (e.g. wheelchair), emphasis (culture, history, fun, relax, etc.), theme (wedding, stag do, girls weekend, etc.), and weather. After **Generate itinerary**, they see the suggested trip and step into **Your trip universe** to drag and edit blocks. They can use **More expensive** / **Less expensive** or open the **AI Copilot** panel to click suggestions (e.g. “Add 2 museums”, “Less expensive options”) or type requests; the copilot can return a revised plan. Save/Load and plan cache work as before.

---

## 2. System flow (request → response)

```mermaid
sequenceDiagram
  participant U as User (browser)
  participant P as app/page.tsx
  participant PlanAPI as app/api/plan
  participant CopilotAPI as app/api/copilot
  participant TripsAPI as app/api/trips
  participant PhotoAPI as app/api/photo
  participant Supabase as Supabase
  participant OAI as OpenAI
  participant Unsplash as Unsplash

  U->>P: Set preferences (vibes, days, optional detail), click Generate
  P->>PlanAPI: POST /api/plan { full preferences }
  PlanAPI->>PlanAPI: Hash preferences
  PlanAPI->>Supabase: Check plan_cache by input hash
  alt cache hit
    Supabase-->>PlanAPI: cached payload
    PlanAPI-->>P: JSON { trip, itinerary }
  else cache miss
    PlanAPI->>OAI: responses.create(...)
    OAI-->>PlanAPI: trip + itinerary JSON
    PlanAPI->>Supabase: Upsert plan_cache
    PlanAPI-->>P: JSON { trip, itinerary }
  end
  P->>P: setPlan(data)
  P->>PhotoAPI: GET /api/photo?q=region (optional)
  PhotoAPI->>Unsplash: search photos
  Unsplash-->>PhotoAPI: image URL
  PhotoAPI-->>P: { url, alt }
  P->>U: Render suggestion + trip universe (hero, days, blocks, fine-tune, copilot button)
  U->>P: Drag / edit / Fine-tune / Open copilot
  P->>CopilotAPI: POST /api/copilot { plan, message }
  CopilotAPI->>OAI: Refine trip
  OAI-->>CopilotAPI: { reply, plan? }
  CopilotAPI-->>P: reply + optional updated plan
  P->>P: Merge plan if returned
  U->>P: Save / Load
  P->>TripsAPI: GET /api/trips or POST /api/trips or GET /api/trips/[id]
  TripsAPI->>Supabase: Read/write trips table
  Supabase-->>P: list or saved payload
  P->>U: Update UI (plan, My trips list)
```

**In words:** Generate hits `/api/plan`, which checks Supabase `plan_cache` by input hash; on miss it calls OpenAI and caches the result. The client optionally fetches a hero image from `/api/photo` (Unsplash). Save/load uses `/api/trips` (GET list, POST save, GET by id) backed by Supabase `trips` table. Drag and inline edits update client state; Save persists the current plan.

---

## 3. App structure (files and roles)

```mermaid
flowchart TB
  subgraph Client["Browser (React)"]
    Page["app/page.tsx"]
    Page --> State["State: prefs, plan, copilot, savedTrips, tripPhoto"]
    Page --> DND["DndContext (@dnd-kit)"]
    Page --> UI["Form (vibes, days, Add more detail) + itinerary + trip universe"]
    UI --> Prefs["Preferences: priciness, origin, transport, constraints, emphasis, theme, weather"]
    UI --> Hero["Hero image (Unsplash)"]
    UI --> Universe["Trip universe: fine-tune + AI Copilot panel"]
    UI --> TimeBlock["TimeBlock + SortableBlock"]
    UI --> SaveLoad["Save / My trips"]
    DND --> TimeBlock
  end

  subgraph Server["Next.js API"]
    PlanRoute["app/api/plan/route.ts"]
    CopilotRoute["app/api/copilot/route.ts"]
    TripsRoute["app/api/trips/route.ts"]
    TripIdRoute["app/api/trips/[id]/route.ts"]
    PhotoRoute["app/api/photo/route.ts"]
  end

  PlanRoute --> OpenAI["OpenAI API"]
  CopilotRoute --> OpenAI
  PlanRoute --> Supabase["Supabase (plan_cache)"]
  TripsRoute --> Supabase["Supabase (trips)"]
  TripIdRoute --> Supabase
  PhotoRoute --> Unsplash["Unsplash API"]

  Page -->|"POST /api/plan (prefs)"| PlanRoute
  Page -->|"POST /api/copilot (plan, msg)"| CopilotRoute
  Page -->|"GET/POST /api/trips"| TripsRoute
  Page -->|"GET /api/trips/[id]"| TripIdRoute
  Page -->|"GET /api/photo?q="| PhotoRoute
  PlanRoute -->|"JSON"| Page
  CopilotRoute -->|"reply, plan?"| Page
  TripsRoute -->|"list / saved"| Page
  PhotoRoute -->|"url, alt"| Page
```

**In words:** `app/page.tsx` holds preferences (vibes, days, and optional detail: priciness, origin, transport, constraints, emphasis, theme, weather), plan state, and copilot state. The form has an “Add more detail” toggle for full dimensions. Plan generation uses `/api/plan` with full preferences (and optional Supabase plan cache). The **trip universe** includes fine-tune buttons and an **AI Copilot** side panel (suggestions + chat) that calls `/api/copilot`; optional revised plans are merged. Drag-and-drop uses **DragOverlay** and **defaultScreenReaderInstructions**. Save/Load use `/api/trips`. See `docs/supabase-schema.sql` for DB tables.

---

## 4. Data shape (what’s in a “plan”)

```mermaid
flowchart LR
  Plan[PlanResponse] --> Trip[trip]
  Plan --> Itinerary[itinerary]

  Trip --> T1[title, summary]
  Trip --> T2[vibe_tags, recommended_region]
  Trip --> T3[best_season, pace]

  Itinerary --> D1[Day 1]
  Itinerary --> D2[Day 2]
  Itinerary --> Dn[Day N]

  D1 --> B[blocks]
  B --> BL[Block: id, time, title, type, notes]
```

**In words:** A plan has **trip** (metadata) and **itinerary** (days with blocks). Saved trips in Supabase store the full plan as `payload` (same shape). Plan cache stores plans keyed by hash(vibes, days) to reduce OpenAI calls. Drag-and-drop and inline edits update client state; **Save this trip** persists to Supabase.

---

## Using these diagrams

- **GitHub / GitLab:** Paste the Mermaid blocks into a `.md` file; they render automatically.
- **VS Code:** Use a “Mermaid” or “Markdown Preview Mermaid” extension.
- **Online:** Copy a block into [mermaid.live](https://mermaid.live) to edit and export as PNG/SVG.
- **Presentations:** Use the “User journey” and “System flow” to explain the value and the tech in one slide each.
