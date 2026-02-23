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

type Step = "params" | "suggestions" | "universe";

function ParamsPage({
  prefs,
  setPrefs,
  canGenerate,
  loading,
  error,
  generate,
}: {
  prefs: TripPreferences;
  setPrefs: React.Dispatch<React.SetStateAction<TripPreferences>>;
  canGenerate: boolean;
  loading: boolean;
  error: string | null;
  generate: () => void;
}) {
  return (
    <div className="hero-with-mesh -mx-6 -mt-6 rounded-2xl border border-[var(--card-border)] p-8 sm:p-10 md:p-12">
      <h2 className="text-center text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
        Design your trip
      </h2>
      <p className="mt-3 text-center text-[var(--muted)]">
        Set your parameters. We’ll suggest three distinct trip ideas worldwide.
      </p>

      <div className="mx-auto mt-10 max-w-2xl space-y-8">
        <div>
          <label className="block text-sm font-medium text-[var(--muted)]" htmlFor="vibes">
            Vibes / keywords
          </label>
          <textarea
            id="vibes"
            rows={3}
            value={prefs.vibes}
            onChange={(e) => setPrefs((p) => ({ ...p, vibes: e.target.value }))}
            placeholder="e.g. warm, sea, street food, architecture, calm"
            className="mt-2 w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--card)]/80 px-4 py-3.5 text-base outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--glow)]"
          />
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)]">
              Duration: <span className="text-[var(--foreground)]">{prefs.days}</span> days
            </label>
            <input
              type="range"
              min={1}
              max={60}
              value={prefs.days}
              onChange={(e) => setPrefs((p) => ({ ...p, days: Number(e.target.value) }))}
              className="mt-2 h-4 w-full cursor-pointer appearance-none rounded-full bg-[var(--muted-bg)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-lg"
              style={{ accentColor: "var(--accent)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)]">
              Budget: <span className="text-[var(--foreground)]">{PRICINESS_LABELS[prefs.priciness - 1]}</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={prefs.priciness}
              onChange={(e) => setPrefs((p) => ({ ...p, priciness: Number(e.target.value) }))}
              className="mt-2 h-4 w-full cursor-pointer appearance-none rounded-full bg-[var(--muted-bg)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-lg"
              style={{ accentColor: "var(--accent)" }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--muted)]">
            Max one-way travel: <span className="text-[var(--foreground)]">{prefs.maxTravelTimeHours}h</span>
          </label>
          <input
            type="range"
            min={1}
            max={24}
            value={prefs.maxTravelTimeHours}
            onChange={(e) => setPrefs((p) => ({ ...p, maxTravelTimeHours: Number(e.target.value) }))}
            className="mt-2 h-4 w-full cursor-pointer appearance-none rounded-full bg-[var(--muted-bg)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-lg"
            style={{ accentColor: "var(--accent)" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--muted)]" htmlFor="origin">
            Origin (city or country)
          </label>
          <input
            id="origin"
            type="text"
            value={prefs.origin}
            onChange={(e) => setPrefs((p) => ({ ...p, origin: e.target.value }))}
            placeholder="e.g. Paris, London"
            className="mt-2 w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--card)]/80 px-4 py-3 text-base outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--glow)]"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)]">Transport</label>
            <select
              value={prefs.transportation}
              onChange={(e) => setPrefs((p) => ({ ...p, transportation: e.target.value }))}
              className="mt-2 w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--card)]/80 px-4 py-3 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--glow)]"
            >
              {TRANSPORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted)]">Theme</label>
            <select
              value={prefs.theme}
              onChange={(e) => setPrefs((p) => ({ ...p, theme: e.target.value }))}
              className="mt-2 w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--card)]/80 px-4 py-3 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--glow)]"
            >
              {THEME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--muted)]">Weather</label>
          <select
            value={prefs.weather}
            onChange={(e) => setPrefs((p) => ({ ...p, weather: e.target.value }))}
            className="mt-2 w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--card)]/80 px-4 py-3 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--glow)]"
          >
            {WEATHER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--muted)]">Emphasis</label>
          <div className="mt-2 flex flex-wrap gap-2">
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
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    on ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25" : "border-2 border-[var(--border)] bg-[var(--card)]/60 text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
                  }`}
                >
                  {em}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--muted)]" htmlFor="constraints">
            Constraints (e.g. wheelchair, dietary)
          </label>
          <input
            id="constraints"
            type="text"
            value={prefs.constraints}
            onChange={(e) => setPrefs((p) => ({ ...p, constraints: e.target.value }))}
            placeholder="Optional"
            className="mt-2 w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--card)]/80 px-4 py-3 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--glow)]"
          />
        </div>

        {error && (
          <p className="rounded-2xl border-2 border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate || loading}
          className="w-full rounded-2xl bg-[var(--accent)] py-4 text-lg font-semibold text-white shadow-xl shadow-[var(--accent)]/30 transition-all hover:bg-[var(--accent-hover)] hover:shadow-[var(--accent)]/40 disabled:opacity-50 disabled:shadow-none"
          aria-busy={loading}
        >
          {loading ? "Finding your trips…" : "Find my trips"}
        </button>
      </div>
    </div>
  );
}

function CinematicOverlay() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--background)]/95 backdrop-blur-md"
      aria-hidden
    >
      <div className="animate-pulse text-xl font-semibold text-[var(--accent)]">Entering trip universe…</div>
      <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-[var(--muted-bg)]">
        <div className="h-full w-full origin-left animate-[shimmer_1.4s_ease-in-out] rounded-full bg-[var(--accent)]" />
      </div>
    </div>
  );
}

function SuggestionCard({
  alternative,
  onSelect,
}: {
  alternative: PlanResponse;
  onSelect: () => void;
}) {
  const [img, setImg] = useState<{ url: string; alt: string } | null>(null);
  const region = alternative.trip.recommended_region || alternative.trip.title || "travel";
  useEffect(() => {
    fetch(`/api/photo?q=${encodeURIComponent(region)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { url?: string; alt?: string } | null) => {
        if (d?.url) setImg({ url: d.url, alt: d.alt ?? region });
      })
      .catch(() => {});
  }, [region]);
  return (
    <article className="suggestion-card flex flex-col overflow-hidden rounded-2xl">
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-[var(--muted-bg)]">
        {img?.url ? (
          <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">Loading…</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-semibold text-white drop-shadow-md">{alternative.trip.title}</h3>
          <p className="mt-0.5 text-xs text-white/90 drop-shadow">{alternative.trip.recommended_region}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 text-sm text-[var(--muted)]">{alternative.trip.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {alternative.trip.vibe_tags?.slice(0, 4).map((t) => (
            <span key={t} className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
              #{t}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">{alternative.trip.best_season} · {alternative.trip.pace}</p>
        <button
          type="button"
          onClick={onSelect}
          className="mt-4 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white shadow-lg shadow-[var(--accent)]/25 transition-all hover:bg-[var(--accent-hover)] hover:shadow-[var(--accent)]/30"
        >
          Enter trip universe
        </button>
      </div>
    </article>
  );
}

export default function Home() {
  const [prefs, setPrefs] = useState<TripPreferences>({
    ...DEFAULT_PREFERENCES,
    vibes: "space, solitude, nature, sun",
    days: 7,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("params");
  const [suggestions, setSuggestions] = useState<PlanResponse[] | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [universeTransition, setUniverseTransition] = useState<"idle" | "playing" | "done">("idle");
  const [selectedForUniverse, setSelectedForUniverse] = useState<PlanResponse | null>(null);
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
    if (universeTransition !== "playing" || !selectedForUniverse) return;
    const t = setTimeout(() => {
      setPlan(selectedForUniverse);
      setStep("universe");
      setUniverseTransition("done");
      setSelectedForUniverse(null);
    }, 1400);
    return () => clearTimeout(t);
  }, [universeTransition, selectedForUniverse]);

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

      const data = (await res.json()) as { alternatives?: PlanResponse[] };
      const list = Array.isArray(data.alternatives) ? data.alternatives : [];
      setSuggestions(list);
      setPlan(null);
      setStep("suggestions");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function selectTrip(alternative: PlanResponse) {
    setSelectedForUniverse(alternative);
    setUniverseTransition("playing");
  }

  function backToSuggestions() {
    setPlan(null);
    setStep("suggestions");
  }

  function goToParams() {
    setStep("params");
    setSuggestions(null);
    setPlan(null);
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
        setSuggestions(null);
        setPlan(payload);
        setStep("universe");
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
    <main className="min-h-screen text-[var(--foreground)]">
      {universeTransition === "playing" && <CinematicOverlay />}
      {plan && copilotOpen && (
        <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--card)]/95 shadow-2xl backdrop-blur-sm md:w-96">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--accent-soft)]/30 px-4 py-3">
            <h3 className="font-semibold text-[var(--accent)]">AI Copilot</h3>
            <button
              type="button"
              onClick={() => setCopilotOpen(false)}
              className="rounded p-1 text-[var(--muted)] hover:bg-[var(--muted-bg)]"
              aria-label="Close copilot"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 border-b border-[var(--border)] bg-[var(--muted-bg)]/30 p-2">
            {COPILOT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendCopilotMessage(s)}
                disabled={copilotLoading}
                className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/50 hover:text-[var(--accent)] disabled:opacity-50"
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
                className={`rounded-xl px-3 py-2.5 text-sm ${msg.role === "user" ? "ml-4 bg-[var(--accent)]/15 text-[var(--foreground)]" : "mr-4 bg-[var(--muted-bg)]"}`}
              >
                {msg.content}
              </div>
            ))}
            {copilotLoading && (
              <div className="rounded-xl bg-[var(--muted-bg)] px-3 py-2.5 text-sm text-[var(--muted)]">Thinking…</div>
            )}
          </div>
          <form
            className="border-t border-[var(--border)] bg-[var(--muted-bg)]/30 p-3"
            onSubmit={(e) => { e.preventDefault(); sendCopilotMessage(copilotInput); }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Ask for changes…"
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--glow)]"
                disabled={copilotLoading}
              />
              <button
                type="submit"
                disabled={copilotLoading || !copilotInput.trim()}
                className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[var(--accent)]/20 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <h1 className="bg-gradient-to-r from-[var(--foreground)] to-[var(--muted)] bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Travel Planner
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            Your vibes → AI itinerary → your trip universe. Elaborate, tweak, and save.
          </p>
        </header>

        {step === "params" && (
          <ParamsPage
            prefs={prefs}
            setPrefs={setPrefs}
            canGenerate={canGenerate}
            loading={loading}
            error={error}
            generate={generate}
          />
        )}

        {step === "suggestions" && (
          <div>
            {(!suggestions || suggestions.length === 0) ? (
              <div className="hero-with-mesh rounded-2xl border border-[var(--card-border)] p-10 text-center">
                <p className="text-[var(--muted)]">No trip ideas yet.</p>
                <button
                  type="button"
                  onClick={goToParams}
                  className="mt-4 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-[var(--accent)]/25 hover:bg-[var(--accent-hover)]"
                >
                  Set parameters & find trips
                </button>
              </div>
            ) : (
              <>
            <button
              type="button"
              onClick={goToParams}
              className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/60 px-4 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/40 hover:text-[var(--foreground)]"
            >
              ← Change parameters
            </button>
            <div className="hero-with-mesh relative overflow-hidden rounded-2xl border border-[var(--card-border)] p-6 text-center">
              <h2 className="text-2xl font-bold text-[var(--foreground)]">Your trip ideas</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Pick one to enter the trip universe and refine it.</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((alt, i) => (
                <SuggestionCard key={i} alternative={alt} onSelect={() => selectTrip(alt)} />
              ))}
            </div>
              </>
            )}
          </div>
        )}

        {step === "universe" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <section className="card-lift rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-medium text-[var(--foreground)]">Trip</h2>
            <button
              type="button"
              onClick={backToSuggestions}
              className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]/50"
            >
              ← Back to suggestions
            </button>
            {dbAvailable === false && (
              <p className="mt-4 text-[11px] text-[var(--muted)]/80">Save & load with Supabase</p>
            )}
            {dbAvailable === true && (
              <>
                <button
                  type="button"
                  onClick={saveTrip}
                  disabled={!plan || saving}
                  className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]/50 disabled:opacity-50"
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
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-2">
                      {savedTrips.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => loadTrip(t.id)}
                            className="w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-[var(--accent-soft)]/40"
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

          <section className="card-lift md:col-span-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
            {plan ? (
              <div>
                {tripPhoto?.url && (
                  <div className="mb-6 overflow-hidden rounded-2xl ring-1 ring-[var(--border)]">
                    <img
                      src={tripPhoto.url}
                      alt={tripPhoto.alt}
                      className="h-52 w-full object-cover"
                    />
                    <p className="bg-[var(--muted-bg)]/80 py-1 pr-3 text-right text-[10px] text-[var(--muted)]">
                      Photo: Unsplash
                    </p>
                  </div>
                )}
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">{plan.trip.title}</h2>
                <p className="mt-2 text-[var(--muted)] leading-relaxed">{plan.trip.summary}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)]">
                    {plan.trip.recommended_region}
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-1.5 text-xs text-[var(--muted)]">
                    {plan.trip.best_season} · {plan.trip.pace}
                  </span>
                  {plan.trip.vibe_tags?.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)]/30 p-5 shadow-[0_0_20px_var(--glow)]">
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
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/50 disabled:opacity-50"
                      >
                        More expensive
                      </button>
                      <button
                        type="button"
                        onClick={() => sendCopilotMessage("Make the trip less expensive / budget-friendly")}
                        disabled={copilotLoading}
                        className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/50 disabled:opacity-50"
                      >
                        Less expensive
                      </button>
                      <button
                        type="button"
                        onClick={() => setCopilotOpen((v) => !v)}
                        className="rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white shadow-md shadow-[var(--accent)]/25 transition-all hover:bg-[var(--accent-hover)] hover:shadow-[var(--accent)]/30"
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
                  <p className="mt-4 text-sm text-[var(--muted)]">
                    Chronological timeline — drag activities between slots; hover for details.
                  </p>
                  <div className="mt-4 overflow-x-auto pb-2">
                    <div className="flex min-w-max gap-4">
                      {plan.itinerary?.map((d) => (
                        <div key={d.day} className="flex gap-3">
                          {TIME_SLOTS.map((time) => (
                            <div
                              key={`${d.day}-${time}`}
                              className="w-56 shrink-0 rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)]/50 p-3"
                            >
                              <div className="mb-2 flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-[var(--muted)]">
                                  Day {d.day} · {time === "morning" ? "AM" : time === "afternoon" ? "PM" : "Eve"}
                                </span>
                                {time === "morning" && (
                                  <span className="text-[10px] text-[var(--muted)]/80">{d.base_location}</span>
                                )}
                              </div>
                              <TimeBlock
                                day={d.day}
                                time={time}
                                title={time === "morning" ? "Morning" : time === "afternoon" ? "Afternoon" : "Evening"}
                                items={d.blocks.filter((b) => b.time === time)}
                                onBlockChange={handleBlockChange}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <DragOverlay>
                    {activeBlock ? (
                      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--card)] p-2.5 shadow-xl ring-2 ring-[var(--accent)]/20">
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
            ) : null}
          </section>
        </div>
        )}
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
      className={`rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 transition-all duration-200 ${
        isOver ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]/40 shadow-[0_0_0_2px_var(--glow)]" : ""
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

  const hoverTitle = block.notes ? `${block.title} — ${block.notes}` : block.title;
  return (
    <li
      ref={setNodeRef}
      style={style}
      title={hoverTitle}
      className={`rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-2.5 transition-shadow ${
        isDragging ? "opacity-90 shadow-xl ring-2 ring-[var(--accent)] shadow-[var(--glow)]" : "hover:shadow-md"
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
