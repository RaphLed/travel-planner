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
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { PlanResponse } from "@/lib/types";
import type { Block, Day } from "@/lib/types";
import type { Destination } from "@/lib/destinations";
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

/** Generic activity phrases that are not specific places — exclude from Maps. */
const VAGUE_PLACE_PATTERNS = /^(free|relax|breakfast|lunch|dinner|rest|travel|transfer|check|free time|free morning|free afternoon|free evening|optional|free day|leisure)$/i;

function looksLikePlace(title: string): boolean {
  const t = title.trim();
  if (t.length < 4) return false;
  if (VAGUE_PLACE_PATTERNS.test(t)) return false;
  return true;
}

function buildGoogleMapsUrl(plan: PlanResponse): string {
  const region = plan.trip?.recommended_region?.trim() || "";
  const waypoints: string[] = [];
  plan.itinerary?.forEach((d) => {
    const base = d.base_location?.trim();
    if (base) waypoints.push(region ? `${base}, ${region}` : base);
    d.blocks.forEach((b) => {
      const title = b.title?.trim();
      if (title && looksLikePlace(title)) waypoints.push(region ? `${title}, ${region}` : title);
    });
  });
  const uniq = [...new Set(waypoints)].slice(0, 23);
  if (uniq.length === 0) return "";
  const destination = encodeURIComponent(uniq.pop()!);
  const waypointsParam = uniq.length > 0 ? `&waypoints=${uniq.map((w) => encodeURIComponent(w)).join("|")}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}${waypointsParam}`;
}

function GoogleMapsLink({ plan }: { plan: PlanResponse }) {
  const url = buildGoogleMapsUrl(plan);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]"
    >
      Open in Google Maps
    </a>
  );
}

function ParamsPage({
  prefs,
  setPrefs,
  canGenerate,
  loading,
  error,
  generate,
  onExploreUniverses,
}: {
  prefs: TripPreferences;
  setPrefs: React.Dispatch<React.SetStateAction<TripPreferences>>;
  canGenerate: boolean;
  loading: boolean;
  error: string | null;
  generate: () => void;
  onExploreUniverses?: () => void;
}) {
  return (
    <div className="hero-with-mesh -mx-6 -mt-6 min-h-[70vh] rounded-none border-0 bg-[var(--background)] px-8 py-24 sm:px-16 md:px-24 lg:px-32">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-center text-4xl font-light tracking-[0.02em] text-[var(--foreground)] sm:text-5xl uppercase">
          Design your trip
        </h2>
        <p className="mt-8 text-center text-[17px] leading-relaxed text-[var(--muted)] max-w-2xl mx-auto">
          Tell us your vibe, how long you’re away, and your budget. We’ll suggest three trip ideas—you can change anything later.
        </p>
        <p className="mt-3 text-center text-[14px] text-[var(--muted)]/80 max-w-xl mx-auto">
          No account needed to start. Fill in what you like and click the button below.
        </p>

        <div className="mt-24 space-y-20">
          <div>
            <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]" htmlFor="vibes">
              Vibes / keywords
            </label>
            <p className="mt-1 text-[13px] text-[var(--muted)]/80">Words that describe the trip you want (e.g. relaxing, food, culture).</p>
            <textarea
              id="vibes"
              rows={3}
              value={prefs.vibes}
              onChange={(e) => setPrefs((p) => ({ ...p, vibes: e.target.value }))}
              placeholder="e.g. warm, sea, street food, architecture, calm"
              className="mt-5 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--card)]/30 px-4 py-4 text-[18px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)]/70 focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid gap-16 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                Duration · <span className="text-[var(--foreground)]">{prefs.days}</span> days
              </label>
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={prefs.days}
                onChange={(e) => setPrefs((p) => ({ ...p, days: Number(e.target.value) }))}
                className="range-luxury range-luxury-lg mt-6 w-full"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                Budget · <span className="text-[var(--foreground)]">{PRICINESS_LABELS[prefs.priciness - 1]}</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={prefs.priciness}
                onChange={(e) => setPrefs((p) => ({ ...p, priciness: Number(e.target.value) }))}
                className="range-luxury range-luxury-lg mt-6 w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Max one-way travel · <span className="text-[var(--foreground)]">{prefs.maxTravelTimeHours}h</span>
            </label>
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={prefs.maxTravelTimeHours}
              onChange={(e) => setPrefs((p) => ({ ...p, maxTravelTimeHours: Number(e.target.value) }))}
              className="range-luxury range-luxury-lg mt-6 w-full"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]" htmlFor="origin">
              Origin (city or country)
            </label>
            <input
              id="origin"
              type="text"
              value={prefs.origin}
              onChange={(e) => setPrefs((p) => ({ ...p, origin: e.target.value }))}
              placeholder="e.g. Paris, London"
              className="mt-5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]/30 px-4 py-4 text-[18px] outline-none transition-colors placeholder:text-[var(--muted)]/70 focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid gap-16 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Transport</label>
              <select
                value={prefs.transportation}
                onChange={(e) => setPrefs((p) => ({ ...p, transportation: e.target.value }))}
                className="mt-5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]/30 px-4 py-4 text-[18px] outline-none focus:border-[var(--accent)]"
              >
                {TRANSPORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Theme</label>
              <select
                value={prefs.theme}
                onChange={(e) => setPrefs((p) => ({ ...p, theme: e.target.value }))}
                className="mt-5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]/30 px-4 py-4 text-[18px] outline-none focus:border-[var(--accent)]"
              >
                {THEME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Weather</label>
            <select
              value={prefs.weather}
              onChange={(e) => setPrefs((p) => ({ ...p, weather: e.target.value }))}
              className="mt-5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]/30 px-4 py-4 text-[18px] outline-none focus:border-[var(--accent)]"
            >
              {WEATHER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Emphasis</label>
            <div className="mt-5 flex flex-wrap gap-3">
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
                    className={`rounded-lg px-5 py-2.5 text-[13px] transition-colors ${
                      on ? "bg-[var(--accent)] text-[var(--card)]" : "text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                    }`}
                  >
                    {em}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]" htmlFor="constraints">
              Constraints (e.g. wheelchair, dietary)
            </label>
            <input
              id="constraints"
              type="text"
              value={prefs.constraints}
              onChange={(e) => setPrefs((p) => ({ ...p, constraints: e.target.value }))}
              placeholder="Optional"
              className="mt-5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]/30 px-4 py-4 text-[18px] outline-none placeholder:text-[var(--muted)]/70 focus:border-[var(--accent)]"
            />
          </div>

          <div className="border-t border-[var(--border)] pt-20">
            <label className="block text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]" htmlFor="tripStory">
              Your trip in a few words
            </label>
            <p className="mt-2 text-[14px] text-[var(--muted)]">
              Any specific story, vibe, or preference we should keep in mind when designing your trip.
            </p>
            <textarea
              id="tripStory"
              rows={4}
              value={prefs.tripStory}
              onChange={(e) => setPrefs((p) => ({ ...p, tripStory: e.target.value }))}
              placeholder="e.g. First time in Japan, want to mix temples and modern city. Love small neighbourhood restaurants."
              className="mt-5 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--card)]/50 px-4 py-4 text-[16px] leading-relaxed outline-none transition-colors placeholder:text-[var(--muted)]/70 focus:border-[var(--accent)]"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--error)]">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-[var(--muted)]/80">We’ll suggest three different trips. Pick one to plan your days in detail.</p>
            <button
              type="button"
              onClick={generate}
              disabled={!canGenerate || loading}
              className="w-full rounded-lg border border-[var(--accent)] bg-[var(--accent)] py-5 text-[17px] font-medium uppercase tracking-[0.12em] text-[var(--card)] transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-busy={loading}
            >
              {loading ? "Finding your trips…" : "Find my trips"}
            </button>
            {onExploreUniverses && (
              <>
                <p className="text-[13px] text-[var(--muted)]/80">Prefer to choose a city first? Browse our list and we’ll build the itinerary for you.</p>
                <button
                  type="button"
                  onClick={onExploreUniverses}
                  className="w-full rounded-lg border border-[var(--border)] py-4 text-[14px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Or explore universes
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CinematicOverlay() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--background)]"
      aria-hidden
    >
      <p className="font-heading text-[17px] font-light text-[var(--foreground)]">Entering your trip</p>
      <div className="mt-6 h-px w-32 overflow-hidden bg-[var(--border)]">
        <div className="h-full w-full origin-left animate-[shimmer_1.2s_ease-in-out] bg-[var(--accent)]" />
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
    <article className="suggestion-card flex flex-col overflow-hidden rounded-xl">
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-[var(--muted-bg)]">
        {img?.url ? (
          <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">Loading…</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--foreground)]/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="font-heading text-lg font-medium tracking-wide text-[var(--card)]">{alternative.trip.recommended_region}</p>
          <p className="mt-0.5 text-sm italic text-[var(--card)]/95">{alternative.trip.title}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-2 text-[15px] leading-relaxed text-[var(--muted)]">{alternative.trip.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {alternative.trip.vibe_tags?.slice(0, 4).map((t) => (
            <span key={t} className="rounded-md bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
              #{t}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-[var(--muted)]">{alternative.trip.best_season} · {alternative.trip.pace}</p>
        <button
          type="button"
          onClick={onSelect}
          className="mt-5 w-full rounded-lg border border-[var(--accent)] bg-[var(--accent)] py-3 text-[14px] font-medium text-[var(--card)] transition-opacity hover:opacity-90"
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
  const [universeView, setUniverseView] = useState<"timeline" | "calendar">("timeline");
  const [activityFilter, setActivityFilter] = useState<string>("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"viewer" | "editor">("viewer");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(false);
  const [destinationPlanLoading, setDestinationPlanLoading] = useState<string | null>(null);
  const [destinationsSort, setDestinationsSort] = useState<{ key: string; order: "asc" | "desc" }>({ key: "name", order: "asc" });
  const [alternativesOpen, setAlternativesOpen] = useState<{ blockId: string; location: string; type: Block["type"]; currentTitle: string } | null>(null);
  const [alternativesList, setAlternativesList] = useState<{ title: string; notes?: string; rating?: string }[]>([]);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [myTripsOpen, setMyTripsOpen] = useState(false);
  const [lastUsedPrefs, setLastUsedPrefs] = useState<TripPreferences | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [calendarStartDate, setCalendarStartDate] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
    if (!exploreOpen) return;
    setDestinationsLoading(true);
    const params = new URLSearchParams();
    params.set("maxTravelTimeHours", String(prefs.maxTravelTimeHours));
    params.set("maxPriciness", String(prefs.priciness));
    if (prefs.transportation && prefs.transportation !== "any") params.set("travelMode", prefs.transportation);
    params.set("sortBy", destinationsSort.key);
    params.set("sortOrder", destinationsSort.order);
    fetch(`/api/destinations?${params}`)
      .then((r) => (r.ok ? r.json() : { destinations: [] }))
      .then((data: { destinations?: Destination[] }) => setDestinations(Array.isArray(data.destinations) ? data.destinations : []))
      .catch(() => setDestinations([]))
      .finally(() => setDestinationsLoading(false));
  }, [exploreOpen, prefs.maxTravelTimeHours, prefs.priciness, prefs.transportation, destinationsSort.key, destinationsSort.order]);

  async function enterUniverseFromDestination(dest: Destination) {
    setDestinationPlanLoading(dest.id);
    try {
      const res = await fetch("/api/plan/destination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: dest.name, prefs }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to generate trip");
      }
      const data = (await res.json()) as PlanResponse;
      setExploreOpen(false);
      setLastUsedPrefs(prefs);
      setPlan(data);
      setStep("universe");
      setDestinationPlanLoading(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate trip");
      setDestinationPlanLoading(null);
    }
  }

  function openBlockAlternatives(block: Block, location: string) {
    setAlternativesOpen({ blockId: block.id, location, type: block.type, currentTitle: block.title });
    setAlternativesList([]);
    setAlternativesLoading(true);
    fetch("/api/block-alternatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, type: block.type, currentTitle: block.title }),
    })
      .then((r) => (r.ok ? r.json() : { alternatives: [] }))
      .then((data: { alternatives?: { title: string; notes?: string; rating?: string }[] }) =>
        setAlternativesList(Array.isArray(data.alternatives) ? data.alternatives : [])
      )
      .catch(() => setAlternativesList([]))
      .finally(() => setAlternativesLoading(false));
  }

  function buildAISummaryMarkdown(): string {
    if (!plan?.trip) return "";
    const t = plan.trip;
    const lines: string[] = [
      `# Trip: ${t.recommended_region}`,
      "",
      `**${t.title}**`,
      "",
      t.summary,
      "",
      `- Pace: ${t.pace} · Best season: ${t.best_season}`,
      t.vibe_tags?.length ? `- Tags: ${t.vibe_tags.join(", ")}` : "",
      "",
    ].filter(Boolean);
    if (lastUsedPrefs) {
      lines.push("## Parameters used", "");
      lines.push(`- **Vibes:** ${lastUsedPrefs.vibes}`);
      lines.push(`- **Duration:** ${lastUsedPrefs.days} days`);
      lines.push(`- **Budget:** ${PRICINESS_LABELS[lastUsedPrefs.priciness - 1]}`);
      if (lastUsedPrefs.origin) lines.push(`- **Origin:** ${lastUsedPrefs.origin}`);
      lines.push(`- **Max travel time:** ${lastUsedPrefs.maxTravelTimeHours}h`);
      if (lastUsedPrefs.transportation !== "any") lines.push(`- **Transport:** ${lastUsedPrefs.transportation}`);
      if (lastUsedPrefs.theme !== "none") lines.push(`- **Theme:** ${lastUsedPrefs.theme}`);
      if (lastUsedPrefs.weather !== "any") lines.push(`- **Weather:** ${lastUsedPrefs.weather}`);
      if (lastUsedPrefs.emphasis.length) lines.push(`- **Emphasis:** ${lastUsedPrefs.emphasis.join(", ")}`);
      if (lastUsedPrefs.constraints) lines.push(`- **Constraints:** ${lastUsedPrefs.constraints}`);
      if (lastUsedPrefs.tripStory) lines.push(`- **Notes:** ${lastUsedPrefs.tripStory}`);
      lines.push("", "---", "");
    }
    lines.push("## Itinerary", "");
    plan.itinerary?.forEach((d) => {
      lines.push(`### Day ${d.day}: ${d.base_location}`, "");
      d.blocks.forEach((b) => {
        const time = b.time === "morning" ? "AM" : b.time === "afternoon" ? "PM" : "Eve";
        lines.push(`- **${time}** — ${b.title} (${b.type})`);
        if (b.notes?.trim()) lines.push(`  ${b.notes}`);
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  function copySummaryForAI() {
    const text = buildAISummaryMarkdown();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setExportOpen(false);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  }

  function buildIcsBlob(startDate: string): string {
    if (!plan?.itinerary?.length || !startDate) return "";
    const date = new Date(startDate);
    if (Number.isNaN(date.getTime())) return "";
    const formatDate = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
    const events: string[] = [];
    plan.itinerary.forEach((day, i) => {
      const start = new Date(date);
      start.setDate(start.getDate() + i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const desc = day.blocks
        .map((b) => {
          const time = b.time === "morning" ? "AM" : b.time === "afternoon" ? "PM" : "Eve";
          return `${time}: ${b.title}${b.notes ? ` — ${b.notes}` : ""}`;
        })
        .join("\\n");
      events.push(
        `BEGIN:VEVENT`,
        `UID:${plan.trip?.recommended_region ?? "trip"}-day-${day.day}-${Date.now()}@travel-planner`,
        `DTSTAMP:${formatDate(new Date())}T120000Z`,
        `DTSTART;VALUE=DATE:${formatDate(start)}`,
        `DTEND;VALUE=DATE:${formatDate(end)}`,
        `SUMMARY:Day ${day.day}: ${day.base_location}`,
        `DESCRIPTION:${desc.replace(/\n/g, "\\n")}`,
        `END:VEVENT`
      );
    });
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Travel Planner//EN",
      "CALSCALE:GREGORIAN",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");
  }

  function downloadCalendar() {
    const start = calendarStartDate || new Date().toISOString().slice(0, 10);
    const blob = buildIcsBlob(start);
    if (!blob) return;
    const url = URL.createObjectURL(new Blob([blob], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `trip-${plan?.trip?.recommended_region ?? "itinerary"}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    setCalendarModalOpen(false);
  }

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
    if (!user) {
      setSavedTrips([]);
      setDbAvailable(true);
      return;
    }
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
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    if (!user) setSavedTrips([]);
  }, [user]);

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
      setLastUsedPrefs(prefs);
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
        if (res.status === 401) {
          setAuthOpen(true);
          setAuthMode("signin");
          setError("Sign in to save trips.");
          return;
        }
        throw new Error(err.error ?? "Failed to save");
      }
      const saved = (await res.json()) as { id: string };
      setSavedTripId(saved.id);
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
        setSavedTripId(id);
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
        <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--card)] md:w-96">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h3 className="font-heading text-lg font-medium text-[var(--foreground)]">AI Copilot</h3>
            <button
              type="button"
              onClick={() => setCopilotOpen(false)}
              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted-bg)]"
              aria-label="Close copilot"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-3">
            {COPILOT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendCopilotMessage(s)}
                disabled={copilotLoading}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[12px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {copilotMessages.length === 0 && (
              <p className="text-sm text-[var(--muted)]">Click a suggestion or type your own (e.g. &quot;Add a food tour&quot; or &quot;Make it less busy&quot;). The AI will update your itinerary.</p>
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
                placeholder="Add, remove, or change any item — e.g. “Add Louvre on Day 2” or “Remove the beach afternoon”"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/30 px-3 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]"
                disabled={copilotLoading}
              />
              <button
                type="submit"
                disabled={copilotLoading || !copilotInput.trim()}
                className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 text-[14px] font-medium text-[var(--card)] disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <header className="mb-16 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-light tracking-tight text-[var(--foreground)] sm:text-3xl">
              Travel Planner
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
              Set your preferences, get three trip ideas, then plan your days. You can save, share, or export your itinerary anytime.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="truncate max-w-[180px] text-[13px] text-[var(--muted)]" title={user.email}>{user.email}</span>
                <button
                  type="button"
                  onClick={async () => {
                    const supabase = createSupabaseClient();
                    if (supabase) await supabase.auth.signOut();
                  }}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setAuthMode("signin"); setAuthOpen(true); setAuthError(null); }}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("signup"); setAuthOpen(true); setAuthError(null); }}
                  className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[var(--card)] hover:opacity-90"
                >
                  Create account
                </button>
              </>
            )}
          </div>
        </header>

        {authOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" aria-modal="true" role="dialog">
            <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h3 className="font-heading text-xl font-medium text-[var(--foreground)]">{authMode === "signin" ? "Sign in" : "Create account"}</h3>
              <p className="mt-1 text-[13px] text-[var(--muted)]">Create an account to save your trips and share them by link. You can skip and keep planning without signing in.</p>
              <form
                className="mt-4 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthLoading(true);
                  setAuthError(null);
                  const supabase = createSupabaseClient();
                  if (!supabase) { setAuthError("Not configured"); setAuthLoading(false); return; }
                  try {
                    if (authMode === "signin") {
                      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
                      if (error) throw error;
                    } else {
                      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
                      if (error) throw error;
                    }
                    setAuthOpen(false);
                    setAuthEmail("");
                    setAuthPassword("");
                  } catch (err: unknown) {
                    setAuthError(err instanceof Error ? err.message : "Something went wrong");
                  } finally {
                    setAuthLoading(false);
                  }
                }}
              >
                <input
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/30 px-3 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/30 px-3 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]"
                  required
                />
                {authError && <p className="text-[13px] text-[var(--error)]">{authError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] py-2.5 text-[13px] font-medium text-[var(--card)] disabled:opacity-50"
                  >
                    {authLoading ? "…" : authMode === "signin" ? "Sign in" : "Create account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthOpen(false); setAuthError(null); }}
                    className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {shareOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" aria-modal="true" role="dialog">
            <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h3 className="font-heading text-xl font-medium text-[var(--foreground)]">Share this trip</h3>
              <p className="mt-1 text-[13px] text-[var(--muted)]">Create a link and send it. The recipient can view the trip (viewer) or edit it (editor).</p>
              {!shareUrl ? (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!savedTripId) { setShareOpen(false); return; }
                    setShareLoading(true);
                    try {
                      const res = await fetch(`/api/trips/${savedTripId}/share`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: shareEmail || undefined, role: shareRole }),
                      });
                      const data = res.ok ? (await res.json()) as { url: string } : null;
                      if (data?.url) setShareUrl(data.url);
                    } finally {
                      setShareLoading(false);
                    }
                  }}
                >
                  <input
                    type="email"
                    placeholder="Their email (optional)"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/30 px-3 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]"
                  />
                  <select
                    value={shareRole}
                    onChange={(e) => setShareRole(e.target.value as "viewer" | "editor")}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/30 px-3 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="viewer">Viewer (read-only)</option>
                    <option value="editor">Editor (can edit)</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={shareLoading}
                      className="flex-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] py-2.5 text-[13px] font-medium text-[var(--card)] disabled:opacity-50"
                    >
                      {shareLoading ? "…" : "Create link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShareOpen(false); setShareUrl(null); }}
                      className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-4">
                  <p className="text-[13px] text-[var(--muted)]">Copy this link and send it:</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/50 px-3 py-2 text-[12px] text-[var(--foreground)]"
                    />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(shareUrl)}
                      className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[var(--card)]"
                    >
                      Copy
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShareOpen(false); setShareUrl(null); }}
                    className="mt-4 w-full rounded-lg border border-[var(--border)] py-2.5 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "params" && (
          <ParamsPage
            prefs={prefs}
            setPrefs={setPrefs}
            canGenerate={canGenerate}
            loading={loading}
            error={error}
            generate={generate}
            onExploreUniverses={() => {
              setSuggestions(null);
              setStep("suggestions");
              setExploreOpen(true);
            }}
          />
        )}

        {step === "suggestions" && (
          <div>
            {(!suggestions || suggestions.length === 0) ? (
              <div className="rounded-xl border border-[var(--border)] p-16 text-center">
                <p className="text-[var(--muted)]">No trip ideas yet. Get three AI suggestions or browse destinations by your parameters.</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={goToParams}
                    className="rounded-lg border border-[var(--border)] px-6 py-2.5 text-[14px] text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    ← Set parameters
                  </button>
                  <button
                    type="button"
                    onClick={() => setExploreOpen(true)}
                    className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-[var(--card)] hover:opacity-90"
                  >
                    Explore universes
                  </button>
                </div>
              </div>
            ) : (
              <>
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={goToParams}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ← Change parameters
              </button>
              <button
                type="button"
                onClick={() => setExploreOpen(true)}
                className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[var(--card)] hover:opacity-90"
              >
                Explore universes
              </button>
            </div>
            <div className="hero-with-mesh relative overflow-hidden rounded-xl border border-[var(--border)] p-12 text-center">
              <h2 className="font-heading text-2xl font-light text-[var(--foreground)] sm:text-3xl">Your trip ideas</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)]">Click a card to plan that trip day by day. Or open the table to pick any city and we’ll build the plan for you.</p>
              <p className="mt-2 text-[13px] text-[var(--muted)]/80">You can go back and change your parameters anytime.</p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((alt, i) => (
                <SuggestionCard key={i} alternative={alt} onSelect={() => selectTrip(alt)} />
              ))}
            </div>
              </>
            )}
          </div>
        )}

        {exploreOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" aria-modal="true" role="dialog">
            <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                <h3 className="font-heading text-xl font-medium text-[var(--foreground)]">Explore universes</h3>
                <button
                  type="button"
                  onClick={() => setExploreOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted-bg)]"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <p className="border-b border-[var(--border)] px-6 py-3 text-[13px] text-[var(--muted)]">
                Cities that match your travel time and budget. Click a column header to sort. Click &quot;Enter trip universe&quot; on a row and we’ll create your day-by-day itinerary for that city.
              </p>
              <div className="min-h-0 flex-1 overflow-auto">
                {destinationsLoading ? (
                  <div className="flex items-center justify-center p-12 text-[var(--muted)]">Loading destinations…</div>
                ) : (
                  <table className="w-full text-left text-[14px]">
                    <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--muted-bg)]/80">
                      <tr>
                        {[
                          { key: "name", label: "City" },
                          { key: "country", label: "Country" },
                          { key: "travelTimeHours", label: "Travel (h)" },
                          { key: "avgTempC", label: "°C" },
                          { key: "avgRainfallMm", label: "Rain" },
                          { key: "beautyScore", label: "Beauty" },
                          { key: "cultureScore", label: "Culture" },
                          { key: "pricinessScore", label: "Price" },
                        ].map(({ key, label }) => (
                          <th
                            key={key}
                            className="cursor-pointer whitespace-nowrap px-4 py-3 font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                            onClick={() => setDestinationsSort((s) => ({ key, order: s.key === key && s.order === "asc" ? "desc" : "asc" }))}
                          >
                            {label} {destinationsSort.key === key ? (destinationsSort.order === "asc" ? "↑" : "↓") : ""}
                          </th>
                        ))}
                        <th className="w-40 px-4 py-3 font-medium text-[var(--muted)]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {destinations.map((d) => (
                        <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--muted-bg)]/30">
                          <td className="px-4 py-3 font-medium text-[var(--foreground)]">{d.name}</td>
                          <td className="px-4 py-3 text-[var(--muted)]">{d.country}</td>
                          <td className="px-4 py-3 text-[var(--muted)]">{d.travelTimeHours}</td>
                          <td className="px-4 py-3 text-[var(--muted)]">{d.avgTempC}</td>
                          <td className="px-4 py-3 text-[var(--muted)]">{d.avgRainfallMm}</td>
                          <td className="px-4 py-3 text-[var(--muted)]">{d.beautyScore}</td>
                          <td className="px-4 py-3 text-[var(--muted)]">{d.cultureScore}</td>
                          <td className="px-4 py-3 text-[var(--muted)]">{d.pricinessScore}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              disabled={destinationPlanLoading !== null}
                              onClick={() => enterUniverseFromDestination(d)}
                              className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-[var(--card)] hover:opacity-90 disabled:opacity-50"
                            >
                              {destinationPlanLoading === d.id ? "…" : "Enter trip universe"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!destinationsLoading && destinations.length === 0 && (
                  <div className="p-12 text-center text-[var(--muted)]">No destinations match your filters. Try relaxing travel time or budget.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {alternativesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" aria-modal="true" role="dialog">
            <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h3 className="font-heading text-lg font-medium text-[var(--foreground)]">Swap this activity</h3>
              <p className="mt-1 text-[13px] text-[var(--muted)]">Best options in {alternativesOpen.location}. Click one to use it instead of the current activity.</p>
              {alternativesLoading ? (
                <p className="mt-4 text-[14px] text-[var(--muted)]">Loading alternatives…</p>
              ) : (
                <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto">
                  {alternativesList.map((alt, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => {
                          if (alternativesOpen) handleBlockChange(alternativesOpen.blockId, { title: alt.title, notes: alt.notes ?? "" });
                          setAlternativesOpen(null);
                        }}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-left text-[14px] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/30"
                      >
                        <span className="font-medium text-[var(--foreground)]">{alt.title}</span>
                        {alt.rating && <span className="ml-2 text-[12px] text-[var(--muted)]">{alt.rating}</span>}
                        {alt.notes && <p className="mt-0.5 text-[12px] text-[var(--muted)]">{alt.notes}</p>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!alternativesLoading && alternativesList.length === 0 && (
                <p className="mt-4 text-[14px] text-[var(--muted)]">No alternatives found. Try editing the activity manually.</p>
              )}
              <button
                type="button"
                onClick={() => setAlternativesOpen(null)}
                className="mt-4 w-full rounded-lg border border-[var(--border)] py-2 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {calendarModalOpen && plan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" aria-modal="true" role="dialog">
            <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h3 className="font-heading text-lg font-medium text-[var(--foreground)]">Add to calendar</h3>
              <p className="mt-1 text-[13px] text-[var(--muted)]">Choose the start date of your trip. We’ll create a .ics file you can open in Outlook, Apple Calendar, or Google Calendar.</p>
              <label className="mt-4 block text-[12px] font-medium uppercase tracking-wider text-[var(--muted)]">Trip start date</label>
              <input
                type="date"
                value={calendarStartDate || new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCalendarStartDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/30 px-3 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]"
              />
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={downloadCalendar}
                  className="flex-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] py-2.5 text-[13px] font-medium text-[var(--card)]"
                >
                  Download .ics
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarModalOpen(false)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {reportOpen && plan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" aria-modal="true" role="dialog">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                <h3 className="font-heading text-xl font-medium text-[var(--foreground)]">Trip report</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[var(--card)]"
                  >
                    Print or save as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Close
                  </button>
                </div>
              </div>
              <p className="border-b border-[var(--border)] px-6 py-2 text-[13px] text-[var(--muted)]">
                Use your browser’s Print button above, then choose &quot;Save as PDF&quot; to download.
              </p>
              <div id="trip-report-printable" className="overflow-y-auto p-6 text-[14px] leading-relaxed prose prose-sm max-w-none">
                <div className="font-heading text-2xl text-[var(--foreground)]">{plan.trip.recommended_region}</div>
                <p className="mt-1 italic text-[var(--muted)]">{plan.trip.title}</p>
                <p className="mt-4">{plan.trip.summary}</p>
                <p className="mt-2 text-[13px] text-[var(--muted)]">{plan.trip.best_season} · {plan.trip.pace}{plan.trip.vibe_tags?.length ? ` · ${plan.trip.vibe_tags.join(", ")}` : ""}</p>
                {lastUsedPrefs && (
                  <div className="mt-8">
                    <h4 className="font-heading text-sm font-medium uppercase tracking-wider text-[var(--muted)]">Parameters</h4>
                    <ul className="mt-2 list-inside list-disc text-[13px] text-[var(--muted)]">
                      <li>Vibes: {lastUsedPrefs.vibes}</li>
                      <li>{lastUsedPrefs.days} days · {PRICINESS_LABELS[lastUsedPrefs.priciness - 1]}</li>
                      {lastUsedPrefs.origin && <li>Origin: {lastUsedPrefs.origin}</li>}
                      {lastUsedPrefs.tripStory && <li>Notes: {lastUsedPrefs.tripStory}</li>}
                    </ul>
                  </div>
                )}
                <div className="mt-8">
                  <h4 className="font-heading text-sm font-medium uppercase tracking-wider text-[var(--muted)]">Itinerary</h4>
                  {plan.itinerary?.map((d) => (
                    <div key={d.day} className="mt-4 border-b border-[var(--border)] pb-4">
                      <p className="font-medium text-[var(--foreground)]">Day {d.day}: {d.base_location}</p>
                      <ul className="mt-2 space-y-1 text-[13px] text-[var(--muted)]">
                        {d.blocks.map((b) => (
                          <li key={b.id}>
                            {b.time === "morning" ? "AM" : b.time === "afternoon" ? "PM" : "Eve"} — {b.title}
                            {b.notes ? ` — ${b.notes}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {buildGoogleMapsUrl(plan) && (
                  <p className="mt-6 text-[13px] text-[var(--muted)]">
                    Map: <a href={buildGoogleMapsUrl(plan)} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">Open in Google Maps</a>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {copySuccess && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--accent)] bg-[var(--card)] px-5 py-3 text-[14px] text-[var(--foreground)] shadow-lg">
            Copied. Paste into ChatGPT or any AI to keep refining.
          </div>
        )}

        {step === "universe" && (
        <div className="flex flex-col gap-8">
          {/* Compact top bar: navigation + save/share/my trips */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/40 px-5 py-4">
            <p className="w-full text-[13px] text-[var(--muted)]/80 md:w-auto md:max-w-sm">Your trip is below. Save to keep it, or use Share to send a link. Export to copy a summary, add to calendar, or print a report.</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={backToSuggestions}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ← Back to suggestions
              </button>
              {dbAvailable === true && user && (
                <>
                  <button
                    type="button"
                    onClick={saveTrip}
                    disabled={!plan || saving}
                    className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium uppercase tracking-wider text-[var(--card)] hover:opacity-90 disabled:opacity-40"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    disabled={!savedTripId}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
                  >
                    Share
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { fetchTrips(); setMyTripsOpen((v) => !v); }}
                      disabled={loadingTrips}
                      className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      {loadingTrips ? "Loading…" : "My trips"}
                    </button>
                    {myTripsOpen && savedTrips.length > 0 && (
                      <>
                        <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMyTripsOpen(false)} />
                        <ul className="absolute left-0 top-full z-20 mt-1 max-h-56 w-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 shadow-sm">
                          {savedTrips.map((t) => (
                            <li key={t.id}>
                              <button
                                type="button"
                                onClick={() => { loadTrip(t.id); setMyTripsOpen(false); }}
                                className="w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--accent-soft)]/50"
                              >
                                {(t.payload as PlanResponse)?.trip?.title ?? "Untitled"} · {new Date(t.updated_at).toLocaleDateString()}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </>
              )}
              {!user && (
                <span className="text-[13px] text-[var(--muted)]">Sign in to save and share</span>
              )}
              {dbAvailable === false && user && (
                <span className="text-[12px] text-[var(--muted)]/80">Save & load with Supabase</span>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((v) => !v)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Export
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-10" aria-hidden onClick={() => setExportOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 shadow-sm">
                      <p className="px-4 py-1 text-[11px] uppercase tracking-wider text-[var(--muted)]">Take your trip elsewhere</p>
                      <button
                        type="button"
                        onClick={copySummaryForAI}
                        className="w-full px-4 py-2.5 text-left text-[13px] text-[var(--foreground)] hover:bg-[var(--muted-bg)]/50"
                      >
                        Copy summary for AI
                      </button>
                      <p className="mx-4 mt-1 text-[11px] text-[var(--muted)]/80">Paste into ChatGPT or any AI to keep refining.</p>
                      <button
                        type="button"
                        onClick={() => { setExportOpen(false); setCalendarModalOpen(true); if (!calendarStartDate) setCalendarStartDate(new Date().toISOString().slice(0, 10)); }}
                        className="w-full px-4 py-2.5 text-left text-[13px] text-[var(--foreground)] hover:bg-[var(--muted-bg)]/50"
                      >
                        Add to calendar
                      </button>
                      <p className="mx-4 mt-1 text-[11px] text-[var(--muted)]/80">Download .ics for Outlook, Apple Calendar, etc.</p>
                      <button
                        type="button"
                        onClick={() => { setExportOpen(false); setReportOpen(true); }}
                        className="w-full px-4 py-2.5 text-left text-[13px] text-[var(--foreground)] hover:bg-[var(--muted-bg)]/50"
                      >
                        Trip report (print / PDF)
                      </button>
                      <p className="mx-4 mt-1 text-[11px] text-[var(--muted)]/80">Full report to print or save as PDF.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <section className="min-h-0 rounded-xl border border-[var(--border)] bg-[var(--card)]/20 p-8 md:p-10">
            {plan ? (
              <div>
                {tripPhoto?.url && (
                  <div className="mb-12 overflow-hidden rounded-xl">
                    <img
                      src={tripPhoto.url}
                      alt={tripPhoto.alt}
                      className="h-80 w-full object-cover"
                    />
                    <p className="mt-2 text-right text-[12px] text-[var(--muted)]">Photo: Unsplash</p>
                  </div>
                )}
                <h2 className="font-heading text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl uppercase">{plan.trip.recommended_region}</h2>
                <p className="mt-3 text-xl italic text-[var(--muted)]">{plan.trip.title}</p>
                <p className="mt-6 text-[16px] leading-relaxed text-[var(--muted)]">{plan.trip.summary}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-[13px] text-[var(--muted)]">{plan.trip.best_season} · {plan.trip.pace}</span>
                  {plan.trip.vibe_tags?.map((t) => (
                    <span key={t} className="text-[12px] text-[var(--muted)]">#{t}</span>
                  ))}
                </div>

                <p className="mt-8 text-[14px] text-[var(--muted)]">
                  Drag activities to reorder. Click any activity to edit it. Use &quot;Swap&quot; to pick a different place for that slot. Open the AI Copilot to ask for more museums, a slower pace, or anything else.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setUniverseView("timeline")}
                    className={`rounded-lg px-3.5 py-2 text-[12px] ${universeView === "timeline" ? "bg-[var(--accent)] text-[var(--card)]" : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                  >
                    Timeline
                  </button>
                  <button
                    type="button"
                    onClick={() => setUniverseView("calendar")}
                    className={`rounded-lg px-3.5 py-2 text-[12px] ${universeView === "calendar" ? "bg-[var(--accent)] text-[var(--card)]" : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                  >
                    Calendar
                  </button>
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/30 px-3 py-2 text-[12px] text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    <option value="">All activities</option>
                    {["food", "nature", "culture", "nightlife", "relax", "logistics"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <GoogleMapsLink plan={plan} />
                  <button
                    type="button"
                    onClick={() => setCopilotOpen((v) => !v)}
                    className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[var(--card)] hover:opacity-90"
                  >
                    {copilotOpen ? "Hide Copilot" : "AI Copilot"}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendCopilotMessage("Make the trip more expensive / upscale")}
                    disabled={copilotLoading}
                    className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
                  >
                    More expensive
                  </button>
                  <button
                    type="button"
                    onClick={() => sendCopilotMessage("Make the trip less expensive / budget-friendly")}
                    disabled={copilotLoading}
                    className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
                  >
                    Less expensive
                  </button>
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
                  {universeView === "timeline" && (
                  <div className="mt-12 overflow-x-auto pb-6">
                    <div className="flex min-w-max gap-14">
                      {plan.itinerary?.map((d) => (
                        <div key={d.day} className="w-96 shrink-0 flex flex-col gap-6">
                          <div className="border-b border-[var(--border)] pb-4">
                            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Day {d.day}</p>
                            <p className="mt-2 font-heading text-xl text-[var(--foreground)]">{d.base_location}</p>
                          </div>
                          {TIME_SLOTS.map((time) => (
                            <div key={time} className="flex flex-col gap-1">
                              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                                {time === "morning" ? "Morning" : time === "afternoon" ? "Afternoon" : "Evening"}
                              </p>
                              <TimeBlock
                                day={d.day}
                                time={time}
                                title={time === "morning" ? "Morning" : time === "afternoon" ? "Afternoon" : "Evening"}
                                items={d.blocks.filter((b) => b.time === time).filter((b) => !activityFilter || b.type === activityFilter)}
                                onBlockChange={handleBlockChange}
                                location={plan.trip?.recommended_region ?? d.base_location}
                                onOpenAlternatives={openBlockAlternatives}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                  {universeView === "calendar" && plan.itinerary && (
                  <div className="mt-12 grid grid-cols-7 gap-4 sm:grid-cols-10">
                    {plan.itinerary.map((d) => (
                      <div
                        key={d.day}
                        className="min-h-28 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 p-4"
                      >
                        <p className="text-[11px] font-medium text-[var(--muted)]">Day {d.day}</p>
                        <p className="mt-0.5 truncate text-[12px] text-[var(--foreground)]">{d.base_location}</p>
                        <p className="mt-2 text-[11px] text-[var(--muted)]">{d.blocks.length} steps</p>
                      </div>
                    ))}
                  </div>
                  )}
                  <DragOverlay>
                    {activeBlock ? (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                        <div className="text-[15px] font-medium text-[var(--foreground)]">{activeBlock.title}</div>
                        {activeBlock.notes ? (
                          <div className="mt-1 text-[13px] text-[var(--muted)]">{activeBlock.notes}</div>
                        ) : null}
                        <span className="mt-2 inline-block rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-2.5 py-0.5 text-[12px] text-[var(--muted)]">
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
  location,
  onOpenAlternatives,
}: {
  day: number;
  time: TimeSlot;
  title: string;
  items: Block[];
  onBlockChange: (blockId: string, updates: Partial<Pick<Block, "title" | "notes" | "type">>) => void;
  location: string;
  onOpenAlternatives: (block: Block, location: string) => void;
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
      className={`min-h-[72px] rounded-xl border border-[var(--border)] bg-[var(--card)]/50 p-4 transition-colors duration-200 ${
        isOver ? "border-[var(--accent)]/40 bg-[var(--muted-bg)]/50" : ""
      }`}
      aria-label={`Day ${day}, ${title}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">{title}</p>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ul className="mt-3 space-y-3 text-[15px] text-[var(--muted)]">
          {items.length === 0 ? (
            <li className="rounded-xl border border-dashed border-[var(--border)] py-6 text-center text-[13px] text-[var(--muted)]">
              Drop here
            </li>
          ) : (
            items.map((b) => (
              <SortableBlock
                key={b.id}
                block={b}
                onBlockChange={onBlockChange}
                location={location}
                onOpenAlternatives={onOpenAlternatives}
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
  location,
  onOpenAlternatives,
}: {
  block: Block;
  onBlockChange: (blockId: string, updates: Partial<Pick<Block, "title" | "notes" | "type">>) => void;
  location: string;
  onOpenAlternatives: (block: Block, location: string) => void;
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
      className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-shadow ${
        isDragging ? "opacity-95 shadow-sm ring-1 ring-[var(--accent)]/20" : "hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-1 shrink-0 cursor-grab touch-none rounded-md p-1 text-[var(--muted)] hover:bg-[var(--muted-bg)] active:cursor-grabbing"
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
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/50 px-3 py-2 text-[15px] outline-none focus:border-[var(--accent)]"
              autoFocus
              aria-label="Edit activity title"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="w-full rounded-lg text-left text-[15px] font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
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
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/50 px-3 py-2 text-[14px] outline-none focus:border-[var(--accent)] resize-none"
              rows={2}
              autoFocus
              aria-label="Edit activity notes"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingNotes(true)}
              className={`mt-2 block w-full rounded-lg text-left text-[14px] focus:outline-none focus:border-[var(--accent)] ${!block.notes ? "italic text-[var(--muted)]" : ""}`}
            >
              {block.notes || "Add notes…"}
            </button>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={block.type}
              onChange={(e) =>
                onBlockChange(block.id, {
                  type: e.target.value as Block["type"],
                })
              }
              className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-2.5 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              aria-label="Activity type"
            >
              {BLOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onOpenAlternatives(block, location)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Swap
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
