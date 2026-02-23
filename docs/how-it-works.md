# How the Travel Planner works

This doc helps you explain the site to others: **what it does** and **how it’s built**, with flowcharts you can view in any Mermaid-supported viewer (e.g. GitHub, VS Code, or [mermaid.live](https://mermaid.live)).

---

## 1. User journey (what the user sees)

```mermaid
flowchart LR
  A[Enter vibes + days] --> B[Click Generate]
  B --> C[See suggested itinerary + hero image]
  C --> D[Your trip universe: day-by-day blocks]
  D --> E[Drag blocks between days/slots]
  E --> F[Edit title, notes, type inline]
  F --> G[Save trip / Load from My trips]
  G --> H[Plan cache reduces repeat API calls]
```

**In words:** The user types vibes and days, then clicks **Generate itinerary**. They see a **suggested itinerary** (trip title, summary, optional hero photo from Unsplash, region, season, pace). Below that, **Your trip universe** lets them elaborate, tweak, and mold the trip: drag blocks between days and time slots, click title/notes to edit inline, change activity type. They can **Save this trip** (if Supabase is configured) and **My trips** to load a saved itinerary. Identical generate requests use a **plan cache** to avoid extra OpenAI calls.

---

## 2. System flow (request → response)

```mermaid
sequenceDiagram
  participant U as User (browser)
  participant P as app/page.tsx
  participant PlanAPI as app/api/plan
  participant TripsAPI as app/api/trips
  participant PhotoAPI as app/api/photo
  participant Supabase as Supabase
  participant OAI as OpenAI
  participant Unsplash as Unsplash

  U->>P: Enter vibes, days, click Generate
  P->>PlanAPI: POST /api/plan { vibes, days }
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
  P->>U: Render suggestion + trip universe (hero image, days, blocks)
  U->>P: Drag / edit / Save / Load
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
    Page --> State["State: vibes, days, plan, savedTrips, tripPhoto, dbAvailable"]
    Page --> DND["DndContext (@dnd-kit)"]
    Page --> UI["UI: form + suggested itinerary + Your trip universe"]
    UI --> Hero["Hero image (Unsplash) when plan exists"]
    UI --> TimeBlock["TimeBlock: droppable zone + SortableContext"]
    TimeBlock --> SortableBlock["SortableBlock: draggable + editable (title, notes, type)"]
    UI --> SaveLoad["Save this trip / My trips"]
    DND --> TimeBlock
  end

  subgraph Server["Next.js API"]
    PlanRoute["app/api/plan/route.ts"]
    TripsRoute["app/api/trips/route.ts"]
    TripIdRoute["app/api/trips/[id]/route.ts"]
    PhotoRoute["app/api/photo/route.ts"]
  end

  PlanRoute --> OpenAI["OpenAI API"]
  PlanRoute --> Supabase["Supabase (plan_cache)"]
  TripsRoute --> Supabase["Supabase (trips)"]
  TripIdRoute --> Supabase["Supabase (trips)"]
  PhotoRoute --> Unsplash["Unsplash API"]

  Page -->|"POST /api/plan"| PlanRoute
  Page -->|"GET/POST /api/trips"| TripsRoute
  Page -->|"GET /api/trips/[id]"| TripIdRoute
  Page -->|"GET /api/photo?q="| PhotoRoute
  PlanRoute -->|"JSON"| Page
  TripsRoute -->|"list / saved"| Page
  PhotoRoute -->|"url, alt"| Page
```

**In words:** `app/page.tsx` holds all state and renders the form, suggested itinerary (with optional Unsplash hero), and **Your trip universe** (DndContext + day cards + sortable blocks). Drag-and-drop uses **DragOverlay** for a visible drag preview and **defaultScreenReaderInstructions** so keyboard and screen-reader users can reorder and move blocks. Save/Load and My trips call `/api/trips`. Plan generation uses `/api/plan` (with optional Supabase plan cache). Trip images come from `/api/photo` (Unsplash). See `docs/supabase-schema.sql` for DB tables.

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
