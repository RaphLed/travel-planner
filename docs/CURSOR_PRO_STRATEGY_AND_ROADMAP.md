# How to Use Cursor Pro Like a Pro — And Make Atlas Professional-Grade

This doc explains how an experienced user would leverage **Cursor Pro** (agents, subagents, rules, and workflows) to improve this travel planner across UI, functionality, AI, visualizations, export, and database. It also lays out a concrete **improvement roadmap** you can execute with Cursor.

---

## 1. How a Professional Uses Cursor Pro

### Agents and subagents
- **Explore agent**: Use for *broad discovery* — e.g. “Map the codebase”, “Find all AI touchpoints”, “List every modal and loading state”. It’s fast and good at scanning; use it first before big refactors.
- **General-purpose agent**: Use for *multi-file, multi-step tasks* — e.g. “Add a design token system and apply it to the params page”, “Implement streaming for trip generation and wire the UI”. Give it clear success criteria and file paths.
- **Shell agent**: Use for *git, npm, and CLI* — e.g. “Run tests”, “Add a migration”, “Build and check for errors”. Keeps terminal work isolated and reproducible.

**Pro move**: Run **multiple agents in parallel** when tasks are independent (e.g. one agent on UI tokens, one on modal a11y, one on AI caching). Then merge their outputs and fix any conflicts.

### Rules and context
- Put **project conventions** in `.cursor/rules` or a single `AGENTS.md`: stack (Next.js, Supabase, Tailwind), patterns (no semicolons in copy, italics for tone), and where key logic lives. This keeps every agent and chat aligned.
- Use **@-mentions** to pin files: e.g. `@app/page.tsx` when changing the main flow, or `@lib/destinations.ts` when expanding the DB. Reduces hallucination and drift.

### Iteration pattern
1. **Audit first** (explore agent or manual search): know the current state.
2. **Plan in small slices**: one doc or todo list (e.g. “Phase 1: design tokens + sticky header + modal a11y”).
3. **Implement with one agent per slice** or with the main chat; run linters and a quick manual test after each slice.
4. **Document** what you changed (changelog or comments) so the next agent or human can continue.

---

## 2. Improvement Roadmap (Prioritized)

### Phase 1 — Foundation (UI and UX)
| # | Item | Impact | Notes |
|---|------|--------|--------|
| 1 | **Design tokens** | High | Type scale and spacing in `globals.css`; use in page and share. Consistent typography and rhythm. |
| 2 | **Sticky header + step indicator** | High | User always knows “Params → Suggestions → Universe”. Reduces confusion. |
| 3 | **Modal a11y and polish** | High | Focus trap, Escape to close, `aria-labelledby`, open/close animation. All major modals. |
| 4 | **InfoTooltip keyboard** | Medium | Focus to open, Escape to close. Required for WCAG. |
| 5 | **Toast and loading feedback** | Medium | Copy-success toast with animation; “Entering trip” overlay with proper aria and optional skeleton. |
| 6 | **Empty and loading states** | Medium | No-destinations, no-trips, share page, My trips list: clear message + CTA; skeletons where useful. |

### Phase 2 — AI and backend
| # | Item | Impact | Notes |
|---|------|--------|--------|
| 7 | **Copilot conversation history** | High | Send last 2–3 turns to API so “make it even cheaper” works in context. |
| 8 | **Cache block-alternatives** | High | Cache by `(location, type)` (and optional currentTitle) in DB or memory; big latency/cost win. |
| 9 | **Stream trip generation** | Very high | First category or first few alternatives as they arrive; rest fill in. Huge perceived speed gain. |
| 10 | **“Why this destination?”** | Medium | Optional AI call returning 2–3 bullets; show in universe or on suggestion card. |
| 11 | **Rate limiting and timeouts** | Medium | Per-user or per-IP limits on AI routes; client and server timeouts to avoid hangs. |

### Phase 3 — Export and data
| # | Item | Impact | Notes |
|---|------|--------|--------|
| 12 | **JSON export** | Medium | Download trip as JSON (plan + itinerary) for backup or integration. |
| 13 | **Trip report / PDF** | Medium | Cleaner print styles, optional cover page, better hierarchy. |
| 14 | **Database schema and migrations** | High | Formal Supabase migrations for `trips`, `share_links`, `plan_cache`; document in repo. |
| 15 | **Optional: day-level AI summary** | Low | One-line “Day N in one sentence” for headers or export. |

### Phase 4 — Polish and scale
| # | Item | Impact | Notes |
|---|------|--------|--------|
| 16 | **Unified Card component** | Medium | Single component with variants; replace ad-hoc card classes. |
| 17 | **Explore table on mobile** | Medium | Card layout or sticky first column on small screens. |
| 18 | **Touch targets** | Medium | Buttons and icon triggers ≥ 44px where possible. |
| 19 | **Range inputs a11y** | Low | `aria-valuetext` or live region for duration, budget, max travel. |

---

## 3. What Was Done in This Session

- **Three explore agents** were run in parallel to produce:
  - Full app and API structure, AI touchpoints, DB, export, destinations.
  - UI/UX audit: hierarchy, responsive, loading, a11y, micro-interactions, and 5–8 pro upgrades.
  - AI audit: endpoints, caching, user-facing features, gaps (streaming, NL dates, explainability, translation, caching), and risks.
- **This roadmap** and the strategy above were written from those audits.
- **Implementation completed:**
  - **Design tokens** in `globals.css`: type scale (`--text-xs` … `--text-5xl`) and spacing scale (`--space-1` … `--space-24`). Modal and toast keyframes (`modal-in`, `toast-in`) for animations.
  - **Sticky step indicator** below the main header: shows Parameters → Suggestions → Your trip with current step highlighted; progress bar style.
  - **Auth modal**: Escape to close (global listener), `aria-labelledby`, `atlas-modal-backdrop` / `atlas-modal-panel` for enter animation.
  - **InfoTooltip**: keyboard-accessible (focus to open, Escape to close); trigger is a `<button>` with larger hit area and focus ring.
  - **Export**: "Download JSON" added to Export dropdown; full trip as `.json` file. Copy-success toast has `atlas-toast` class and `role="status"` for a11y.
  - **Copilot**: last 2 turns (4 messages) sent as `history` to `/api/copilot`; API includes them in the user prompt so follow-ups like "make it even cheaper" work in context.
  - **Block-alternatives cache**: in-memory cache by `(location, type)` with 1-hour TTL in `app/api/block-alternatives/route.ts`; reduces latency and cost for repeated same location/type.

---

## 4. Quick Reference: Key Files

| Area | Files |
|------|--------|
| Main flow, UI | `app/page.tsx` |
| Share view | `app/share/[token]/page.tsx` |
| Styles, tokens | `app/globals.css`, `app/layout.tsx` |
| AI | `app/api/plan/route.ts`, `app/api/plan/destination/route.ts`, `app/api/copilot/route.ts`, `app/api/block-alternatives/route.ts` |
| Data & types | `lib/types.ts`, `lib/destinations.ts`, `lib/trip-preferences.ts` |
| DB | `lib/supabase/*`, Supabase `trips`, `share_links`, `plan_cache` |
| Export | In `app/page.tsx`: `buildAISummaryMarkdown`, `buildIcsBlob`, trip report print section |

Use this doc as the single source of truth for “what to do next” and “how to use Cursor” on this project.
