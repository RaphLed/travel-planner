"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  defaultScreenReaderInstructions,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlanResponse } from "@/lib/types";
import type { Block, Day } from "@/lib/types";
import {
  DEFAULT_PREFERENCES,
  EMPHASIS_OPTIONS,
  PRICINESS_LABELS,
  THEME_OPTIONS,
  TRANSPORT_OPTIONS,
  WEATHER_OPTIONS,
  type TripPreferences,
} from "@/lib/trip-preferences";

const TIME_SLOTS = ["morning", "afternoon", "evening"] as const;
type TimeSlot = (typeof TIME_SLOTS)[number];

function droppableId(day: number, time: TimeSlot): string {
  return `day-${day}-${time}`;
}

function getBlocksByTime(blocks: Block[]): Record<TimeSlot, Block[]> {
  const out: Record<TimeSlot, Block[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  for (const b of blocks) {
    if (TIME_SLOTS.includes(b.time)) out[b.time].push(b);
  }
  return out;
}

function setBlocksForTime(
  byTime: Record<TimeSlot, Block[]>,
  time: TimeSlot,
  newBlocks: Block[]
): Block[] {
  const order: TimeSlot[] = ["morning", "afternoon", "evening"];
  const next = { ...byTime, [time]: newBlocks };
  return order.flatMap((t) => next[t]);
}

/** Resolve overId (zone or block id) to target day index, time slot, and insert index. */
function resolveOverId(
  overId: string,
  itinerary: Day[]
): { dayIndex: number; time: TimeSlot; insertIndex: number } | null {
  const zoneMatch = overId.match(/^day-(\d+)-(morning|afternoon|evening)$/);
  if (zoneMatch) {
    const dayNum = parseInt(zoneMatch[1], 10);
    const time = zoneMatch[2] as TimeSlot;
    const dayIndex = itinerary.findIndex((d) => d.day === dayNum);
    if (dayIndex === -1) return null;
    const byTime = getBlocksByTime(itinerary[dayIndex].blocks);
    return {
      dayIndex,
      time,
      insertIndex: byTime[time].length,
    };
  }
  for (let dayIndex = 0; dayIndex < itinerary.length; dayIndex++) {
    const byTime = getBlocksByTime(itinerary[dayIndex].blocks);
    for (const slot of TIME_SLOTS) {
      const list = byTime[slot];
      const idx = list.findIndex((b) => b.id === overId);
      if (idx !== -1)
        return { dayIndex, time: slot, insertIndex: idx };
    }
  }
  return null;
}

function findBlockAndSource(
  itinerary: Day[],
  blockId: string
): { block: Block; dayIndex: number; time: TimeSlot; indexInSlot: number } | null {
  for (let dayIndex = 0; dayIndex < itinerary.length; dayIndex++) {
    const byTime = getBlocksByTime(itinerary[dayIndex].blocks);
    for (const slot of TIME_SLOTS) {
      const list = byTime[slot];
      const indexInSlot = list.findIndex((b) => b.id === blockId);
      if (indexInSlot !== -1)
        return {
          block: list[indexInSlot],
          dayIndex,
          time: slot,
          indexInSlot,
        };
    }
  }
  return null;
}

function updateBlockInItinerary(
  itinerary: Day[],
  blockId: string,
  updates: Partial<Pick<Block, "title" | "notes" | "type">>
): Day[] {
  return itinerary.map((day) => ({
    ...day,
    blocks: day.blocks.map((b) =>
      b.id === blockId ? { ...b, ...updates } : b
    ),
  }));
}

type SavedTrip = { id: string; created_at: string; updated_at: string; payload: PlanResponse };

const COPILOT_SUGGESTIONS = [
  "Add 2 museums",
  "More beach time",
  "Less expensive options",
  "Wheelchair-accessible only",
  "Add a food tour",
  "Slower pace",
  "More nightlife",
  "Family-friendly only",
];

export default function Home() {
  const [prefs, setPrefs] = useState<TripPreferences>({
    ...DEFAULT_PREFERENCES,
    vibes: "space, solitude, nature, sun",
    days: 7,
  });
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [dbAvailable, setDbAvailable] = useState<boolean | null>(null);
  const [tripPhoto, setTripPhoto] = useState<{ url: string; alt: string } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);

  const canGenerate = useMemo(() => prefs.vibes.trim().length > 0 && prefs.days >= 1, [prefs.vibes, prefs.days]);

  const activeBlock = useMemo(() => {
    if (!plan?.itinerary || !activeDragId) return null;
    return findBlockAndSource(plan.itinerary, activeDragId)?.block ?? null;
  }, [plan?.itinerary, activeDragId]);

  useEffect(() => {
    if (!plan?.trip) {
      setTripPhoto(null);
      return;
    }
    const query = plan.trip.recommended_region || plan.trip.title || "travel";
    fetch(`/api/photo?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { url?: string; alt?: string } | null) => {
        if (data?.url) setTripPhoto({ url: data.url, alt: data.alt ?? query });
        else setTripPhoto(null);
      })
      .catch(() => setTripPhoto(null));
  }, [plan?.trip?.title, plan?.trip?.recommended_region]);

  const fetchTrips = useCallback(async () => {
    setLoadingTrips(true);
    try {
      const res = await fetch("/api/trips");
      if (res.ok) {
        const data = (await res.json()) as SavedTrip[];
        setSavedTrips(data);
        setDbAvailable(true);
      } else {
        setDbAvailable(false);
      }
    } catch {
      setDbAvailable(false);
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  async function generate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as PlanResponse;
      setPlan(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function sendCopilotMessage(message: string) {
    if (!message.trim()) return;
    setCopilotLoading(true);
    const userMsg = message.trim();
    setCopilotMessages((m) => [...m, { role: "user", content: userMsg }]);
    setCopilotInput("");
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, message: userMsg }),
      });
      const data = res.ok ? (await res.json()) as { reply?: string; plan?: PlanResponse } : null;
      const reply = data?.reply ?? "I couldn’t process that. Try rephrasing.";
      setCopilotMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (data?.plan) setPlan(data.plan);
    } catch {
      setCopilotMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setCopilotLoading(false);
    }
  }

  async function saveTrip() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: plan }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to save");
      }
      await fetchTrips();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save trip.");
    } finally {
      setSaving(false);
    }
  }

  async function loadTrip(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/trips/${id}`);
      if (!res.ok) throw new Error("Trip not found");
      const data = (await res.json()) as SavedTrip;
      const payload = data.payload as PlanResponse;
      if (payload?.trip && Array.isArray(payload?.itinerary)) {
        setPlan(payload);
      } else {
        throw new Error("Invalid trip data");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load trip.");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    if (!plan?.itinerary || !over || active.id === over.id) return;

    const source = findBlockAndSource(plan.itinerary, String(active.id));
    const target = resolveOverId(String(over.id), plan.itinerary);
    if (!source || !target) return;

    const { block, dayIndex: srcDayIndex, time: srcTime } = source;
    const { dayIndex: dstDayIndex, time: dstTime, insertIndex } = target;

    const byTimeSrc = getBlocksByTime(plan.itinerary[srcDayIndex].blocks);
    const withoutBlock = byTimeSrc[srcTime].filter((b) => b.id !== block.id);
    const srcBlocks = setBlocksForTime(byTimeSrc, srcTime, withoutBlock);

    const movedBlock: Block = { ...block, time: dstTime };
    const byTimeDst =
      srcDayIndex === dstDayIndex
        ? getBlocksByTime(srcBlocks)
        : getBlocksByTime(plan.itinerary[dstDayIndex].blocks);
    const dstList = [...byTimeDst[dstTime]];
    dstList.splice(insertIndex, 0, movedBlock);
    const dstBlocks = setBlocksForTime(
      { ...byTimeDst, [dstTime]: dstList },
      dstTime,
      dstList
    );

    const newItinerary = plan.itinerary.map((d, i) => {
      if (i === srcDayIndex && i === dstDayIndex) {
        return { ...d, blocks: dstBlocks };
      }
      if (i === srcDayIndex) return { ...d, blocks: srcBlocks };
      if (i === dstDayIndex) return { ...d, blocks: dstBlocks };
      return d;
    });

    setPlan({ ...plan, itinerary: newItinerary });
  }

  const handleBlockChange = useCallback(
    (blockId: string, updates: Partial<Pick<Block, "title" | "notes" | "type">>) => {
      if (!plan?.itinerary) return;
      setPlan({
        ...plan,
        itinerary: updateBlockInItinerary(plan.itinerary, blockId, updates),
      });
    },
    [plan]
  );

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {plan && copilotOpen && (
        <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-xl md:w-96">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-3">
            <h3 className="font-semibold">AI Copilot</h3>
            <button
              type="button"
              onClick={() => setCopilotOpen(false)}
              className="rounded p-1 text-[var(--muted)] hover:bg-[var(--muted-bg)]"
              aria-label="Close copilot"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 border-b border-[var(--border)] p-2">
            {COPILOT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendCopilotMessage(s)}
                disabled={copilotLoading}
                className="rounded-full border border-[var(--border)] bg-[var(--muted-bg)] px-2.5 py-1 text-xs hover:bg-[var(--border)] disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {copilotMessages.length === 0 && (
              <p className="text-sm text-[var(--muted)]">Click a suggestion or type below to refine your trip.</p>
            )}
            {copilotMessages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "ml-4 bg-[var(--accent)]/20" : "mr-4 bg-[var(--muted-bg)]"}`}
              >
                {msg.content}
              </div>
            ))}
            {copilotLoading && (
              <div className="rounded-lg bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--muted)]">Thinking…</div>
            )}
          </div>
          <form
            className="border-t border-[var(--border)] p-2"
            onSubmit={(e) => { e.preventDefault(); sendCopilotMessage(copilotInput); }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Ask for changes…"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                disabled={copilotLoading}
              />
              <button
                type="submit"
                disabled={copilotLoading || !copilotInput.trim()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Travel Planner</h1>
          <p className="mt-2 text-[var(--muted)]">
            Your vibes → AI itinerary → your trip universe. Elaborate, tweak, and save.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Inputs */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <h2 className="text-lg font-medium">Trip input</h2>

            <label className="mt-4 block text-sm text-[var(--muted)]" htmlFor="vibes">
              Vibes / keywords
            </label>
            <textarea
              id="vibes"
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              rows={3}
              value={prefs.vibes}
              onChange={(e) => setPrefs((p) => ({ ...p, vibes: e.target.value }))}
              placeholder="e.g. warm, sea, street food, architecture, calm"
            />

            <label className="mt-4 block text-sm text-[var(--muted)]" htmlFor="days">
              Duration (days)
            </label>
            <input
              id="days"
              type="number"
              min={1}
              max={60}
              value={prefs.days}
              onChange={(e) => setPrefs((p) => ({ ...p, days: Number(e.target.value) || 1 }))}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />

            <button
              type="button"
              onClick={() => setShowMoreOptions((v) => !v)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--border)]"
            >
              {showMoreOptions ? "Hide extra options" : "Add more detail"}
            </button>

            {showMoreOptions && (
              <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                <div>
                  <label className="block text-sm text-[var(--muted)]">Priciness</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={prefs.priciness}
                      onChange={(e) => setPrefs((p) => ({ ...p, priciness: Number(e.target.value) }))}
                      className="h-2 flex-1 rounded-full accent-[var(--accent)]"
                    />
                    <span className="w-16 text-xs text-[var(--muted)]">{PRICINESS_LABELS[prefs.priciness - 1]}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--muted)]" htmlFor="origin">Origin (city/country)</label>
                  <input
                    id="origin"
                    type="text"
                    value={prefs.origin}
                    onChange={(e) => setPrefs((p) => ({ ...p, origin: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-2 text-sm"
                    placeholder="e.g. Paris, France"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--muted)]">Max travel time (hours)</label>
                  <input
                    type="range"
                    min={1}
                    max={24}
                    value={prefs.maxTravelTimeHours}
                    onChange={(e) => setPrefs((p) => ({ ...p, maxTravelTimeHours: Number(e.target.value) }))}
                    className="mt-1 h-2 w-full rounded-full accent-[var(--accent)]"
                  />
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">{prefs.maxTravelTimeHours}h one-way</span>
                </div>
                <div>
                  <label className="block text-sm text-[var(--muted)]">Transport</label>
                  <select
                    value={prefs.transportation}
                    onChange={(e) => setPrefs((p) => ({ ...p, transportation: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-2 text-sm"
                  >
                    {TRANSPORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--muted)]">Constraints (e.g. wheelchair, dietary)</label>
                  <input
                    type="text"
                    value={prefs.constraints}
                    onChange={(e) => setPrefs((p) => ({ ...p, constraints: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--muted)]">Emphasis</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {EMPHASIS_OPTIONS.map((em) => {
                      const on = prefs.emphasis.includes(em);
                      return (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setPrefs((p) => ({
                            ...p,
                            emphasis: on ? p.emphasis.filter((e) => e !== em) : [...p.emphasis, em],
                          }))}
                          className={`rounded-full px-2.5 py-1 text-xs ${on ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] bg-[var(--muted-bg)]"}`}
                        >
                          {em}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--muted)]">Theme</label>
                  <select
                    value={prefs.theme}
                    onChange={(e) => setPrefs((p) => ({ ...p, theme: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-2 text-sm"
                  >
                    {THEME_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--muted)]">Weather</label>
                  <select
                    value={prefs.weather}
                    onChange={(e) => setPrefs((p) => ({ ...p, weather: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-2 text-sm"
                  >
                    {WEATHER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={generate}
              disabled={!canGenerate || loading}
              className="mt-5 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              aria-busy={loading}
            >
              {loading ? "Generating…" : "Generate itinerary"}
            </button>

            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            )}

            <p className="mt-4 text-xs text-[var(--muted)]">
              Drag blocks to reorder; click title or notes to edit inline.
            </p>

            {dbAvailable === false && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                Add Supabase env vars to save and load trips.
              </p>
            )}
            {dbAvailable === true && (
              <>
                <button
                  type="button"
                  onClick={saveTrip}
                  disabled={!plan || saving}
                  className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saving ? "Saving…" : "Save this trip"}
                </button>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={fetchTrips}
                    disabled={loadingTrips}
                    className="text-sm font-medium text-[var(--accent)] hover:underline"
                  >
                    {loadingTrips ? "Loading…" : "My trips"}
                  </button>
                  {savedTrips.length > 0 && (
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-2">
                      {savedTrips.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => loadTrip(t.id)}
                            className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--border)]"
                          >
                            {(t.payload as PlanResponse)?.trip?.title ?? "Untitled"} · {new Date(t.updated_at).toLocaleDateString()}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Output: suggested itinerary → trip universe */}
          <section className="md:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            {!plan ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted-bg)] p-8 text-center text-[var(--muted)]">
                <p className="text-sm">
                  No plan yet. Enter vibes and click <span className="font-medium text-[var(--foreground)]">Generate itinerary</span>, then step into your trip universe to refine it.
                </p>
              </div>
            ) : (
              <div>
                {tripPhoto?.url && (
                  <div className="mb-6 overflow-hidden rounded-xl">
                    <img
                      src={tripPhoto.url}
                      alt={tripPhoto.alt}
                      className="h-48 w-full object-cover"
                    />
                    <p className="mt-1 text-right text-[10px] text-[var(--muted)]">
                      Photo: Unsplash
                    </p>
                  </div>
                )}
                <h2 className="text-2xl font-semibold">{plan.trip.title}</h2>
                <p className="mt-2 text-[var(--muted)]">{plan.trip.summary}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-1">
                    Region: {plan.trip.recommended_region}
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-1">
                    Season: {plan.trip.best_season}
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-1">
                    Pace: {plan.trip.pace}
                  </span>
                  {plan.trip.vibe_tags?.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--muted)]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border-2 border-[var(--accent)]/30 bg-[var(--muted-bg)]/80 p-5 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--accent)]">Your trip universe</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Elaborate, tweak, and mold your trip. Drag activities between days and time slots; click to edit.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => sendCopilotMessage("Make the trip more expensive / upscale")}
                        disabled={copilotLoading}
                        className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--border)] disabled:opacity-50"
                      >
                        More expensive
                      </button>
                      <button
                        type="button"
                        onClick={() => sendCopilotMessage("Make the trip less expensive / budget-friendly")}
                        disabled={copilotLoading}
                        className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--border)] disabled:opacity-50"
                      >
                        Less expensive
                      </button>
                      <button
                        type="button"
                        onClick={() => setCopilotOpen((v) => !v)}
                        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        {copilotOpen ? "Hide" : "AI Copilot"}
                      </button>
                    </div>
                  </div>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  accessibility={{
                    screenReaderInstructions: defaultScreenReaderInstructions,
                  }}
                >
                  <div className="mt-4 space-y-4">
                    {plan.itinerary?.map((d) => (
                      <div
                        key={d.day}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--muted-bg)] p-4"
                      >
                        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <h4 className="text-lg font-medium">Day {d.day}</h4>
                          <span className="text-sm text-[var(--muted)]">
                            Base: {d.base_location}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          {TIME_SLOTS.map((time) => (
                            <TimeBlock
                              key={time}
                              day={d.day}
                              time={time}
                              title={
                                time === "morning"
                                  ? "Morning"
                                  : time === "afternoon"
                                    ? "Afternoon"
                                    : "Evening"
                              }
                              items={d.blocks.filter((b) => b.time === time)}
                              onBlockChange={handleBlockChange}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <DragOverlay>
                    {activeBlock ? (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg ring-2 ring-[var(--accent)]">
                        <div className="text-[var(--foreground)]">{activeBlock.title}</div>
                        {activeBlock.notes ? (
                          <div className="mt-1 text-xs text-[var(--muted)]">{activeBlock.notes}</div>
                        ) : null}
                        <span className="mt-1 inline-block rounded-full border border-[var(--border)] bg-[var(--muted-bg)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
                          {activeBlock.type}
                        </span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function TimeBlock({
  day,
  time,
  title,
  items,
  onBlockChange,
}: {
  day: number;
  time: TimeSlot;
  title: string;
  items: Block[];
  onBlockChange: (blockId: string, updates: Partial<Pick<Block, "title" | "notes" | "type">>) => void;
}) {
  const id = droppableId(day, time);
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { day, time },
  });
  const itemIds = useMemo(() => items.map((b) => b.id), [items]);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 transition-colors ${
        isOver ? "border-[var(--accent)] bg-[var(--accent-soft)]" : ""
      }`}
      aria-label={`Day ${day}, ${title}`}
    >
      <p className="text-sm font-medium">{title}</p>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">
          {items.length === 0 ? (
            <li className="rounded-lg border border-dashed border-[var(--border)] py-4 text-center">
              Drop here
            </li>
          ) : (
            items.map((b) => (
              <SortableBlock
                key={b.id}
                block={b}
                onBlockChange={onBlockChange}
              />
            ))
          )}
        </ul>
      </SortableContext>
    </div>
  );
}

const BLOCK_TYPES: Block["type"][] = [
  "food",
  "nature",
  "culture",
  "nightlife",
  "relax",
  "logistics",
];

function SortableBlock({
  block,
  onBlockChange,
}: {
  block: Block;
  onBlockChange: (blockId: string, updates: Partial<Pick<Block, "title" | "notes" | "type">>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [titleDraft, setTitleDraft] = useState(block.title);
  const [notesDraft, setNotesDraft] = useState(block.notes);

  useEffect(() => {
    if (!editingTitle) setTitleDraft(block.title);
  }, [block.title, editingTitle]);
  useEffect(() => {
    if (!editingNotes) setNotesDraft(block.notes);
  }, [block.notes, editingNotes]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const saveTitle = () => {
    setEditingTitle(false);
    const t = titleDraft.trim();
    if (t && t !== block.title) onBlockChange(block.id, { title: t });
    else setTitleDraft(block.title);
  };

  const saveNotes = () => {
    setEditingNotes(false);
    if (notesDraft !== block.notes) onBlockChange(block.id, { notes: notesDraft });
    else setNotesDraft(block.notes);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 ${
        isDragging ? "opacity-80 shadow-lg ring-2 ring-[var(--accent)]" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-[var(--muted)] hover:bg-[var(--muted-bg)] active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder: ${block.title}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="9" cy="5" r="1" />
            <circle cx="9" cy="12" r="1" />
            <circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="5" r="1" />
            <circle cx="15" cy="12" r="1" />
            <circle cx="15" cy="19" r="1" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setTitleDraft(block.title);
                  setEditingTitle(false);
                }
              }}
              className="w-full rounded border border-[var(--border)] bg-[var(--muted-bg)] px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              autoFocus
              aria-label="Edit activity title"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="w-full rounded text-left focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:ring-inset"
            >
              {block.title}
            </button>
          )}

          {editingNotes ? (
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={saveNotes}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setNotesDraft(block.notes);
                  setEditingNotes(false);
                }
              }}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--muted-bg)] px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
              rows={2}
              autoFocus
              aria-label="Edit activity notes"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingNotes(true)}
              className={`mt-1 block w-full rounded text-left text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:ring-inset ${!block.notes ? "italic text-[var(--muted)]" : ""}`}
            >
              {block.notes || "Add notes…"}
            </button>
          )}

          <select
            value={block.type}
            onChange={(e) =>
              onBlockChange(block.id, {
                type: e.target.value as Block["type"],
              })
            }
            className="mt-2 rounded-full border border-[var(--border)] bg-[var(--muted-bg)] px-2 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            aria-label="Activity type"
          >
            {BLOCK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  );
}
