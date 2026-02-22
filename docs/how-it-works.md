# How the Travel Planner works

This doc helps you explain the site to others: **what it does** and **how it’s built**, with flowcharts you can view in any Mermaid-supported viewer (e.g. GitHub, VS Code, or [mermaid.live](https://mermaid.live)).

---

## 1. User journey (what the user sees)

```mermaid
flowchart LR
  A[Enter vibes + days] --> B[Click Generate]
  B --> C[See trip title + summary]
  C --> D[See day-by-day itinerary]
  D --> E[Morning / Afternoon / Evening blocks]
  E --> F[Drag blocks to reorder or move]
  F --> G[State updates in browser only]
```

**In words:** The user types what they’re in the mood for (e.g. “space, solitude, nature, sun”) and how many days. After they click **Generate itinerary**, they get a trip idea (title, summary, region, season, pace) and a day-by-day plan. Each day is split into Morning, Afternoon, and Evening, with activity blocks. Soon they’ll be able to drag those blocks to reorder within a slot or move them to another day or time slot; the itinerary state updates in the browser (no persistence yet).

---

## 2. System flow (request → response)

```mermaid
sequenceDiagram
  participant U as User (browser)
  participant P as app/page.tsx
  participant API as app/api/plan/route.ts
  participant OAI as OpenAI

  U->>P: Enter vibes, days, click Generate
  P->>P: setLoading(true), setError(null)
  P->>API: POST /api/plan { vibes, days }
  API->>API: Validate OPENAI_API_KEY, body
  API->>OAI: responses.create(...) with trip prompt + json_object
  OAI-->>API: Response (trip + itinerary JSON)
  API->>API: Parse and validate
  API-->>P: JSON { trip, itinerary }
  P->>P: setPlan(data), setLoading(false)
  P->>U: Render trip header + day cards + blocks
  U->>P: Drag block to new slot
  P->>P: handleDragEnd → update plan.itinerary immutably
  P->>U: Re-render itinerary
```

**In words:** The React page sends a single POST with the user’s vibes and day count. The API route calls OpenAI with a fixed schema (trip metadata + itinerary with blocks). The API returns that JSON; the client stores it in state and renders the trip and days. When the user drags a block to another day or time slot, the client updates `plan.itinerary` immutably and re-renders. No database yet — everything lives in memory on the client.

---

## 3. App structure (files and roles)

```mermaid
flowchart TB
  subgraph Client["Browser (React)"]
    Page["app/page.tsx"]
    Page --> State["State: vibes, days, plan, loading, error"]
    Page --> DND["DndContext (@dnd-kit)"]
    Page --> UI["UI: form + trip header + day cards"]
    UI --> TimeBlock["TimeBlock: droppable zone + SortableContext"]
    TimeBlock --> SortableBlock["SortableBlock: draggable activity"]
    DND --> TimeBlock
  end

  subgraph Server["Next.js server"]
    Route["app/api/plan/route.ts"]
    Route --> OpenAI["OpenAI API"]
  end

  Page -->|"POST { vibes, days }"| Route
  Route -->|"JSON { trip, itinerary }"| Page
```

**In words:** The only page is `app/page.tsx`. It holds all state and wraps the itinerary in `DndContext` (@dnd-kit). Each time slot (Morning, Afternoon, Evening) is a droppable zone with id `day-${day}-${time}`; each activity is a sortable item. On drag end, the client updates `plan.itinerary` immutably. The only API route is `app/api/plan/route.ts`; it talks to OpenAI and returns the plan.

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

**In words:** A plan has two top-level parts: **trip** (metadata and vibe) and **itinerary** (list of days). Each day has a day number, base location, and **blocks**. Each block has an id (e.g. `d1-m-1`), a time slot (morning/afternoon/evening), title, type (food, nature, culture, etc.), and notes. Drag-and-drop reorders and moves blocks between days and time slots; the same structure is updated in client state (and will be persisted when save/load is added).

---

## Using these diagrams

- **GitHub / GitLab:** Paste the Mermaid blocks into a `.md` file; they render automatically.
- **VS Code:** Use a “Mermaid” or “Markdown Preview Mermaid” extension.
- **Online:** Copy a block into [mermaid.live](https://mermaid.live) to edit and export as PNG/SVG.
- **Presentations:** Use the “User journey” and “System flow” to explain the value and the tech in one slide each.
