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
import { getDestinationContext } from "@/lib/destination-context";
import {
  DEFAULT_PREFERENCES,
  EMPHASIS_OPTIONS,
  PRICINESS_LABELS,
  CONSTRAINT_PRESETS,
  THEME_OPTIONS,
  TRANSPORT_OPTIONS,
  TRIP_STRUCTURE_OPTIONS,
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

function InfoTooltip({ text, children }: { text?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const content = children ?? text ?? "";
  const isString = typeof content === "string";

  const openTooltip = () => setOpen(true);
  const closeTooltip = () => setOpen(false);

  return (
    <span
      className="relative ml-1.5 inline-flex cursor-help"
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      onFocus={openTooltip}
      onBlur={closeTooltip}
    >
      <button
        type="button"
        tabIndex={0}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[10px] font-medium text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-2"
        aria-label={isString ? (content as string) : "More information"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            closeTooltip();
            (e.target as HTMLElement).blur();
          }
        }}
      >
        i
      </button>
      {open && (
        <span
          className="absolute left-0 top-full z-[100] mt-1.5 max-w-[280px] rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--foreground)] shadow-lg"
          role="tooltip"
          id="info-tooltip-content"
        >
          {isString ? (
            <span className="italic">{content as string}</span>
          ) : (
            content
          )}
        </span>
      )}
    </span>
  );
}

const COPILOT_SUGGESTIONS = [
  "Add 2 museums",
  "More beach time",
  "Less expensive options",
  "Wheelchair-accessible only",
  "Add a food tour",
  "Slower pace",
  "More nightlife",
  "Family-friendly only",
  "Add a walking tour",
  "Swap one activity for something quieter",
  "Make Day 2 less busy",
  "More local / authentic spots",
  "Add lunch recommendations",
  "Remove the busiest day",
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

function buildGoogleMapsUrl(plan: PlanResponse, origin?: string): string {
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
  const originParam = origin?.trim() ? `&origin=${encodeURIComponent(origin)}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}${waypointsParam}${originParam}`;
}

function GoogleMapsLink({ plan, origin }: { plan: PlanResponse; origin?: string }) {
  const url = buildGoogleMapsUrl(plan, origin);
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
          Shape your trip
        </h2>
        <p className="mt-8 text-center text-[17px] leading-relaxed text-[var(--muted)] max-w-2xl mx-auto">
          Tell us how you want to travel—we’ll shape trip ideas that match. Pick one and step into your itinerary. <em>Refine it as you like.</em>
        </p>
        <p className="mt-3 text-center text-[14px] text-[var(--muted)]/80 max-w-xl mx-auto">
          No account needed. Hover the (i) next to any field for a little more guidance.
        </p>

        <div className="mt-24 space-y-20">
          <div>
            <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]" htmlFor="vibes">
              Vibes / keywords
              <InfoTooltip>Short mood and theme words <em>that steer suggestions</em> (e.g. relaxing, food, culture). We use them to match you with destinations and itineraries. Combine with Emphasis for specific activities.</InfoTooltip>
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
              <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                Duration · <span className="text-[var(--foreground)]">{prefs.days}</span> days
                <InfoTooltip text="Total trip length in days. We’ll split the itinerary across these days (morning / afternoon / evening blocks) and adjust density accordingly." />
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
              <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                Budget · <span className="text-[var(--foreground)]">{PRICINESS_LABELS[prefs.priciness - 1]}</span>
                <InfoTooltip>1 = budget, 5 = splurge. Influences activities, accommodation and which destinations appear in Explore.</InfoTooltip>
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
            <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Max one-way travel · <span className="text-[var(--foreground)]">{prefs.maxTravelTimeHours}h</span>
              <InfoTooltip>Maximum one-way journey time from your origin. Destinations beyond this are hidden in Explore. Set to 24 to see all.</InfoTooltip>
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
            <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]" htmlFor="origin">
              Origin (city or country)
              <InfoTooltip>Your departure city or region. Used to filter by travel time in Explore and to build Google Maps routes.</InfoTooltip>
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
              <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Transport
                <InfoTooltip>Preferred way to reach the destination (flight, train, etc.). Used to filter the Explore table. <em>Any</em> shows all.</InfoTooltip>
              </label>
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
              <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Theme
                <InfoTooltip>Optional trip type (honeymoon, family, solo). We’ll bias suggestions and pacing to match.</InfoTooltip>
              </label>
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
            <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Trip structure
              <InfoTooltip><em>Single</em> is one city or region. <em>Multi</em> is several stops (e.g. safari + beach, or city-hopping). This shapes day-by-day suggestions and logistics.</InfoTooltip>
            </label>
            <p className="mt-1 text-[13px] text-[var(--muted)]/80">One base or several stops (e.g. city only vs safari + beach).</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4">
              {TRIP_STRUCTURE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, tripStructure: opt.value as "single" | "multi" }))}
                  className={`rounded-xl border px-5 py-4 text-left transition-colors ${
                    prefs.tripStructure === opt.value
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]/50 text-[var(--foreground)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
                  }`}
                >
                  <span className="block font-medium">{opt.label}</span>
                  <span className="mt-0.5 block text-[12px] opacity-90">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Weather
              <InfoTooltip>Broad preference for temperature and rain. Expand <em>Add weather details</em> to set min/max temp, max rainfall or UV. We use this to filter destinations and tailor timing.</InfoTooltip>
            </label>
            <p className="mt-1 text-[13px] text-[var(--muted)]/80">Quick preference. Optionally add details below.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {WEATHER_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, weather: o.value }))}
                  className={`rounded-full px-4 py-2.5 text-[14px] transition-colors ${
                    prefs.weather === o.value
                      ? "bg-[var(--accent)] text-[var(--card)]"
                      : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <details className="mt-4 group">
              <summary className="cursor-pointer list-none text-[14px] text-[var(--muted)] hover:text-[var(--foreground)]">
                Add weather details (optional)
              </summary>
              <div className="mt-3 grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/30 p-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] text-[var(--muted)]">Min temp (°C)</label>
                  <input
                    type="number"
                    min={-10}
                    max={45}
                    placeholder="Any"
                    value={prefs.weatherDetail?.tempMinC ?? ""}
                    onChange={(e) => setPrefs((p) => ({
                      ...p,
                      weatherDetail: { ...p.weatherDetail, tempMinC: e.target.value === "" ? undefined : Number(e.target.value) },
                    }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]/50 px-3 py-2 text-[14px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[var(--muted)]">Max temp (°C)</label>
                  <input
                    type="number"
                    min={-10}
                    max={45}
                    placeholder="Any"
                    value={prefs.weatherDetail?.tempMaxC ?? ""}
                    onChange={(e) => setPrefs((p) => ({
                      ...p,
                      weatherDetail: { ...p.weatherDetail, tempMaxC: e.target.value === "" ? undefined : Number(e.target.value) },
                    }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]/50 px-3 py-2 text-[14px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[var(--muted)]">Max rainfall (mm)</label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    placeholder="Any"
                    value={prefs.weatherDetail?.maxRainfallMm ?? ""}
                    onChange={(e) => setPrefs((p) => ({
                      ...p,
                      weatherDetail: { ...p.weatherDetail, maxRainfallMm: e.target.value === "" ? undefined : Number(e.target.value) },
                    }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]/50 px-3 py-2 text-[14px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[var(--muted)]">Max UV index</label>
                  <input
                    type="number"
                    min={0}
                    max={11}
                    placeholder="Any"
                    value={prefs.weatherDetail?.maxUvIndex ?? ""}
                    onChange={(e) => setPrefs((p) => ({
                      ...p,
                      weatherDetail: { ...p.weatherDetail, maxUvIndex: e.target.value === "" ? undefined : Number(e.target.value) },
                    }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]/50 px-3 py-2 text-[14px]"
                  />
                </div>
              </div>
            </details>
          </div>

          <div>
            <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Emphasis
              <InfoTooltip>Activity types to prioritise (museums, beaches, gastronomy). Distinct from Vibes and Trip story. Selecting several is fine. We’ll blend them into the itinerary.</InfoTooltip>
            </label>
            <p className="mt-1 text-[13px] text-[var(--muted)]/80">Types of experiences you want (optional).</p>
            <div className="mt-3 flex flex-wrap gap-2">
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
                    className={`rounded-full px-3.5 py-2 text-[13px] transition-colors ${
                      on ? "bg-[var(--accent)] text-[var(--card)]" : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {em}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]" htmlFor="constraints">
              Constraints & accessibility
              <InfoTooltip>Mobility, dietary or family needs. We use this to tailor activities and venue suggestions in your itinerary.</InfoTooltip>
            </label>
            <p className="mt-1 text-[13px] text-[var(--muted)]/80">Add any requirements so we can tailor activities and suggestions. Click a tag below or type your own.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CONSTRAINT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, constraints: p.constraints ? `${p.constraints}, ${preset.value}` : preset.value }))}
                  className="rounded-full border border-[var(--border)] px-3.5 py-2 text-[13px] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              id="constraints"
              type="text"
              value={prefs.constraints}
              onChange={(e) => setPrefs((p) => ({ ...p, constraints: e.target.value }))}
              placeholder="Or type your own (e.g. no stairs, quiet mornings)"
              className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]/30 px-4 py-4 text-[18px] outline-none placeholder:text-[var(--muted)]/70 focus:border-[var(--accent)]"
            />
          </div>

          <div className="border-t border-[var(--border)] pt-20">
            <label className="flex items-center text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]" htmlFor="tripStory">
              Your trip in a few words
              <InfoTooltip>Free-form context: first time in the country, special occasion, pace. We use this with your vibes and emphasis to shape your trip ideas.</InfoTooltip>
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
            <p className="text-[13px] text-[var(--muted)]/80">We’ll propose trip ideas that fit. Choose one and we’ll build your days.</p>
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
                <p className="text-[13px] text-[var(--muted)]/80">Or start from a place you love—browse destinations and we’ll design the trip.</p>
                <button
                  type="button"
                  onClick={onExploreUniverses}
                  className="w-full rounded-lg border border-[var(--border)] py-4 text-[14px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Explore by destination
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
  const [suggestionCategories, setSuggestionCategories] = useState<{ name: string; alternatives: PlanResponse[] }[]>([]);
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
  const [destinationsRegion, setDestinationsRegion] = useState<string>("all");
  const [exploreDateFrom, setExploreDateFrom] = useState<string>("");
  const [exploreDateTo, setExploreDateTo] = useState<string>("");
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
    if (prefs.weatherDetail?.maxRainfallMm != null) params.set("maxRainfall", String(prefs.weatherDetail.maxRainfallMm));
    if (destinationsRegion && destinationsRegion !== "all") params.set("region", destinationsRegion);
    if (prefs.origin?.trim()) params.set("origin", prefs.origin.trim());
    if (exploreDateFrom) params.set("date_from", exploreDateFrom);
    if (exploreDateTo) params.set("date_to", exploreDateTo);
    params.set("sortBy", destinationsSort.key);
    params.set("sortOrder", destinationsSort.order);
    fetch(`/api/destinations?${params}`)
      .then((r) => (r.ok ? r.json() : { destinations: [] }))
      .then((data: { destinations?: Destination[] }) => setDestinations(Array.isArray(data.destinations) ? data.destinations : []))
      .catch(() => setDestinations([]))
      .finally(() => setDestinationsLoading(false));
  }, [exploreOpen, prefs.maxTravelTimeHours, prefs.priciness, prefs.transportation, prefs.weatherDetail?.maxRainfallMm, prefs.origin, destinationsRegion, exploreDateFrom, exploreDateTo, destinationsSort.key, destinationsSort.order]);

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

  function downloadJson() {
    if (!plan) return;
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trip-${plan.trip?.recommended_region ?? "itinerary"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
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
      "PRODID:-//Atlas//EN",
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

  useEffect(() => {
    if (!authOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAuthOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  async function generate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setStep("suggestions");
    setSuggestions(null);
    setSuggestionCategories([]);

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

      const data = (await res.json()) as { alternatives?: PlanResponse[]; categories?: { name: string; alternatives: PlanResponse[] }[] };
      const categories = Array.isArray(data.categories) ? data.categories : [];
      const list = Array.isArray(data.alternatives) ? data.alternatives : categories.flatMap((c) => c.alternatives || []);
      setLastUsedPrefs(prefs);
      setSuggestions(list);
      setSuggestionCategories(categories.filter((c) => Array.isArray(c.alternatives) && c.alternatives.length > 0));
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
    setSuggestionCategories([]);
    setPlan(null);
  }

  async function sendCopilotMessage(message: string) {
    if (!message.trim()) return;
    setCopilotLoading(true);
    const userMsg = message.trim();
    setCopilotMessages((m) => [...m, { role: "user", content: userMsg }]);
    setCopilotInput("");
    const history = copilotMessages.slice(-4);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, message: userMsg, history }),
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
      const url = savedTripId ? `/api/trips/${savedTripId}` : "/api/trips";
      const method = savedTripId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
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
        setSuggestionCategories([]);
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
          <details className="border-b border-[var(--border)] group" open={copilotMessages.length === 0}>
            <summary className="cursor-pointer list-none px-5 py-3 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--muted-bg)]/50">
              How to use
            </summary>
            <div className="px-5 pb-4 text-[13px] text-[var(--muted)] space-y-2">
              <p>Tell the Copilot what you want—more museums, a slower day, a different restaurant. It rewrites your itinerary to match.</p>
              <p>Tap a suggestion or type your own. One message, one refresh.</p>
            </div>
          </details>
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
              <p className="text-sm text-[var(--muted)]">Ask for anything—we’ll adjust your plan and show the result here.</p>
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
            <h1 className="font-heading text-2xl font-light tracking-[0.15em] text-[var(--foreground)] sm:text-3xl uppercase">
              Atlas
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
              Plan the trip you'll love. Save, share, and export when you’re ready—or refine every detail with the AI Copilot.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => { fetchTrips(); setMyTripsOpen(true); }}
                  disabled={loadingTrips}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {loadingTrips ? "…" : "My trips"}
                </button>
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

        {/* Sticky step indicator */}
        <nav aria-label="Progress" className="sticky top-0 z-20 -mx-6 mb-8 flex border-b border-[var(--border)] bg-[var(--card)]/95 px-6 py-3 backdrop-blur-sm">
          <ol className="mx-auto flex w-full max-w-[1200px] items-center gap-2 sm:gap-4">
            {[
              { id: "params", label: "Parameters", step: "params" as const },
              { id: "suggestions", label: "Suggestions", step: "suggestions" as const },
              { id: "universe", label: "Your trip", step: "universe" as const },
            ].map((item, i) => {
              const isActive = step === item.step;
              const isPast = (step === "suggestions" && item.step === "params") || (step === "universe" && item.step !== "universe");
              return (
                <li key={item.id} className="flex flex-1 items-center">
                  <span className={`flex min-w-[44px] items-center justify-center rounded-full py-1.5 text-[12px] font-medium sm:min-w-[28px] sm:px-0 ${isActive ? "bg-[var(--accent)] text-[var(--card)]" : isPast ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--muted-bg)] text-[var(--muted)]"}`}>
                    {i + 1}
                  </span>
                  <span className={`ml-2 hidden text-[13px] sm:inline ${isActive ? "font-medium text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{item.label}</span>
                  {i < 2 && <span className="ml-2 flex-1 border-t border-[var(--border)] sm:ml-4" aria-hidden />}
                </li>
              );
            })}
          </ol>
        </nav>

        {authOpen && (
          <div
            className="atlas-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby="auth-dialog-title"
          >
            <div className="atlas-modal-panel w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
              <h3 id="auth-dialog-title" className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">{authMode === "signin" ? "Sign in" : "Create account"}</h3>
              <ul className="mt-4 space-y-2 text-[14px] text-[var(--muted)]">
                <li className="flex items-center gap-2"><span className="text-[var(--accent)]">·</span> Save trips to your account and access them from any device</li>
                <li className="flex items-center gap-2"><span className="text-[var(--accent)]">·</span> Share a link so others can view or collaborate on your itinerary</li>
                <li className="flex items-center gap-2"><span className="text-[var(--accent)]">·</span> Keep a history of your plans and drafts in one place</li>
              </ul>
              <form
                className="mt-6 space-y-4"
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
                    const msg = err instanceof Error ? err.message : "Something went wrong";
                    setAuthError(msg.includes("Invalid login") ? "Invalid email or password." : msg);
                  } finally {
                    setAuthLoading(false);
                  }
                }}
              >
                <label className="block">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--muted)]">Email</span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/30 px-4 py-3 text-[15px] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--muted)]">Password</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/30 px-4 py-3 text-[15px] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    required
                  />
                </label>
                {authMode === "signin" && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!authEmail.trim()) { setAuthError("Enter your email first."); return; }
                      setAuthLoading(true);
                      setAuthError(null);
                      const supabase = createSupabaseClient();
                      if (!supabase) { setAuthLoading(false); return; }
                      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, { redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback` });
                      setAuthLoading(false);
                      setAuthError(error ? error.message : "Check your email for a reset link.");
                    }}
                    disabled={authLoading}
                    className="text-[13px] text-[var(--accent)] hover:underline disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                )}
                {authError && <p className="text-[13px] text-[var(--error)]">{authError}</p>}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] py-3 text-[14px] font-medium text-[var(--card)] shadow-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {authLoading ? "…" : authMode === "signin" ? "Sign in" : "Create account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthOpen(false); setAuthError(null); }}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-[14px] text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
              <p className="mt-4 text-center text-[13px] text-[var(--muted)]">
                {authMode === "signin" ? "Don’t have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(null); }}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {authMode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        )}

        {shareOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" aria-modal="true" role="dialog">
            <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <h3 className="font-heading text-xl font-medium text-[var(--foreground)]">Share this trip</h3>
              <p className="mt-1 text-[13px] text-[var(--muted)]">Share a link—they can view or edit. Any changes they make sync to your trip.</p>
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

        {myTripsOpen && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" aria-modal="true" role="dialog">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                <h3 className="font-heading text-xl font-semibold tracking-tight text-[var(--foreground)]">Your trips</h3>
                <button type="button" onClick={() => setMyTripsOpen(false)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--muted-bg)]" aria-label="Close">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {loadingTrips ? (
                  <div className="flex items-center justify-center py-16 text-[var(--muted)]">Loading your trips…</div>
                ) : savedTrips.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted-bg)]/20 py-16 text-center">
                    <p className="text-[15px] text-[var(--foreground)]">No saved trips yet</p>
                    <p className="mt-2 text-[14px] text-[var(--muted)]">Save a trip and it appears here—ready to open or share from any device.</p>
                    <button type="button" onClick={() => { setMyTripsOpen(false); setStep("params"); }} className="mt-6 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 text-[14px] font-medium text-[var(--card)] hover:opacity-90">Start planning</button>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {savedTrips.map((t) => {
                      const p = t.payload as PlanResponse;
                      const title = p?.trip?.title ?? p?.trip?.recommended_region ?? "Untitled trip";
                      const region = p?.trip?.recommended_region ?? "";
                      return (
                        <li key={t.id} className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[var(--foreground)]">{title}</p>
                            {region && <p className="mt-0.5 text-[13px] text-[var(--muted)]">{region}</p>}
                            <p className="mt-1 text-[12px] text-[var(--muted)]">Updated {new Date(t.updated_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => { loadTrip(t.id); setMyTripsOpen(false); }} className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[var(--card)] hover:opacity-90">Open</button>
                            <button type="button" onClick={() => { setSavedTripId(t.id); setMyTripsOpen(false); setShareOpen(true); setShareUrl(null); }} className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]">Share</button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("Remove this trip from your account? This can't be undone.")) return;
                                const res = await fetch(`/api/trips/${t.id}`, { method: "DELETE" });
                                if (res.ok) {
                                  if (savedTripId === t.id) { setSavedTripId(null); setPlan(null); setStep("suggestions"); }
                                  await fetchTrips();
                                }
                              }}
                              className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--error)]"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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
              setSuggestionCategories([]);
              setStep("suggestions");
              setExploreOpen(true);
            }}
          />
        )}

        {step === "suggestions" && (
          <div>
            {loading ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/30 p-12">
                <div className="flex flex-col items-center justify-center gap-6">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" aria-hidden />
                  <p className="text-[15px] font-medium text-[var(--foreground)]">Preparing your trips…</p>
                  <p className="text-[13px] text-[var(--muted)]">We’re matching destinations and building day-by-day ideas. This usually takes a moment.</p>
                </div>
                <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/30">
                      <div className="h-44 animate-pulse bg-[var(--border)]/40" />
                      <div className="flex flex-1 flex-col p-5">
                        <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--border)]/40" />
                        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-[var(--border)]/30" />
                        <div className="mt-4 space-y-2">
                          <div className="h-3 w-full animate-pulse rounded bg-[var(--border)]/30" />
                          <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--border)]/30" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (!suggestions || suggestions.length === 0) ? (
              <div className="rounded-xl border border-[var(--border)] p-16 text-center">
                <p className="text-[var(--muted)]">Your trip ideas will appear here. Generate some from the form above, or explore by destination first.</p>
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
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)]">Choose a trip and we’ll open your day-by-day plan. Or browse the table and pick any city—we’ll build the itinerary.</p>
              <p className="mt-2 text-[13px] text-[var(--muted)]/80">Change your parameters anytime and generate again.</p>
            </div>
            {suggestionCategories.length > 0 ? (
              <div className="mt-12 space-y-14">
                {suggestionCategories.map((cat) => (
                  <section key={cat.name}>
                    <h3 className="font-heading text-lg font-medium text-[var(--foreground)] mb-6">{cat.name}</h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {cat.alternatives.map((alt, i) => (
                        <SuggestionCard key={`${cat.name}-${i}`} alternative={alt} onSelect={() => selectTrip(alt)} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((alt, i) => (
                  <SuggestionCard key={i} alternative={alt} onSelect={() => selectTrip(alt)} />
                ))}
              </div>
            )}
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
              <div className="border-b border-[var(--border)] px-6 py-4">
                <p className="mb-3 text-[13px] text-[var(--muted)]">
                  Filter by departure, travel time, region, and rainfall. Hover column headers for details. Pick a destination and hit &quot;Enter trip universe&quot; to build your itinerary.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="text-[13px] text-[var(--muted)]">Departure city</span>
                    <input
                      type="text"
                      value={prefs.origin}
                      onChange={(e) => setPrefs((p) => ({ ...p, origin: e.target.value.trim() }))}
                      placeholder="e.g. London"
                      className="w-36 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)]"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-[13px] text-[var(--muted)]">Max travel (h)</span>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={prefs.maxTravelTimeHours}
                      onChange={(e) => setPrefs((p) => ({ ...p, maxTravelTimeHours: Math.max(0, Math.min(24, Number(e.target.value) || 0)) }))}
                      className="w-16 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[14px] text-[var(--foreground)]"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-[13px] text-[var(--muted)]">Max rainfall (mm)</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Any"
                      value={prefs.weatherDetail?.maxRainfallMm ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0);
                        setPrefs((p) => ({ ...p, weatherDetail: { ...p.weatherDetail, maxRainfallMm: v } }));
                      }}
                      className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)]"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-[13px] text-[var(--muted)]">Region</span>
                    <select
                      value={destinationsRegion}
                      onChange={(e) => setDestinationsRegion(e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[14px] text-[var(--foreground)]"
                    >
                      <option value="all">All</option>
                      <option value="Europe">Europe</option>
                      <option value="Asia">Asia</option>
                      <option value="Americas">Americas</option>
                      <option value="Africa">Africa</option>
                      <option value="Oceania">Oceania</option>
                      <option value="Middle East">Middle East</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-[13px] text-[var(--muted)]">Weather from</span>
                    <input
                      type="date"
                      value={exploreDateFrom}
                      onChange={(e) => setExploreDateFrom(e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[14px] text-[var(--foreground)]"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-[13px] text-[var(--muted)]">to</span>
                    <input
                      type="date"
                      value={exploreDateTo}
                      onChange={(e) => setExploreDateTo(e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[14px] text-[var(--foreground)]"
                    />
                  </label>
                </div>
                <p className="mt-1 text-[11px] text-[var(--muted)]">Optional: set dates to see temperature and rainfall for your trip period (sourced from climate data).</p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {destinationsLoading ? (
                  <div className="flex items-center justify-center p-12 text-[var(--muted)]">Loading destinations…</div>
                ) : (
                  <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-[14px]">
                    <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--muted-bg)]/80">
                      <tr>
                        {[
                          { key: "name", label: "City", tooltip: "Destination city name" },
                          { key: "country", label: "Country", tooltip: "Country" },
                          { key: "region", label: "Region", tooltip: "Continent or region" },
                          { key: "distanceKm", label: "Dist (km)", tooltip: "Distance from your departure city (when set)" },
                          { key: "travelTimeHours", label: "Travel (h)", tooltip: "One-way travel time in hours from your departure city (approximate)" },
                          { key: "avgTempC", label: "°C", tooltip: "Average temperature in Celsius for the period" },
                          { key: "avgRainfallMm", label: "Rain (mm)", tooltip: "Average rainfall in millimetres per month" },
                          { key: "beautyScore", label: "Beauty", tooltip: "Scenery and beauty score from 1 (low) to 5 (high)" },
                          { key: "cultureScore", label: "Culture", tooltip: "Culture and history score from 1 to 5" },
                          { key: "safetyScore", label: "Safety", tooltip: "Safety and kid-friendly score from 1 to 5" },
                          { key: "foodScore", label: "Food", tooltip: "Food and dining scene score from 1 to 5" },
                          { key: "partyScore", label: "Nightlife", tooltip: "Nightlife and vibe score from 1 to 5" },
                          { key: "relaxScore", label: "Relax", tooltip: "Serenity and relaxation vs energetic (1–5)" },
                          { key: "beachAccessScore", label: "Beach", tooltip: "Access to beach and coastal quality (1–5)" },
                          { key: "familyScore", label: "Family", tooltip: "Family-friendly score from 1 to 5" },
                          { key: "pricinessScore", label: "Price", tooltip: "Priciness: 1 = budget, 5 = splurge" },
                        ].map(({ key, label, tooltip }) => (
                          <th
                            key={key}
                            title={tooltip}
                            className="cursor-pointer whitespace-nowrap px-3 py-3 font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                            onClick={() => setDestinationsSort((s) => ({ key: key as typeof destinationsSort.key, order: s.key === key && s.order === "asc" ? "desc" : "asc" }))}
                          >
                            {label} {destinationsSort.key === key ? (destinationsSort.order === "asc" ? "↑" : "↓") : ""}
                          </th>
                        ))}
                        <th className="w-40 shrink-0 px-4 py-3 font-medium text-[var(--muted)]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {destinations.map((d) => (
                        <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--muted-bg)]/30">
                          <td className="px-3 py-3 font-medium text-[var(--foreground)]">{d.name}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.country}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.region ?? "—"}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.distanceKm != null ? d.distanceKm : "—"}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.travelTimeHours}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.avgTempC}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.avgRainfallMm}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.beautyScore}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.cultureScore}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.safetyScore}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.foodScore ?? "—"}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.partyScore}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.relaxScore ?? "—"}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.beachAccessScore ?? "—"}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.familyScore ?? "—"}</td>
                          <td className="px-3 py-3 text-[var(--muted)]">{d.pricinessScore}</td>
                          <td className="px-3 py-3">
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
                </div>
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
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
              <h3 className="font-heading text-lg font-semibold tracking-tight text-[var(--foreground)]">Add to calendar</h3>
              <p className="mt-2 text-[14px] text-[var(--muted)]">Set your trip start date. We’ll generate an .ics file compatible with Outlook, Apple Calendar, and Google Calendar.</p>
              <label className="mt-5 block text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Trip start date</label>
              <input
                type="date"
                value={calendarStartDate || new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCalendarStartDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/40 px-4 py-3 text-[15px] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
              />
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={downloadCalendar}
                  className="flex-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] py-3 text-[14px] font-medium text-[var(--card)] shadow-sm hover:opacity-90"
                >
                  Download .ics
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarModalOpen(false)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[14px] text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {reportOpen && plan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4" aria-modal="true" role="dialog">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--muted-bg)]/30 px-6 py-4">
                <h3 className="font-heading text-xl font-semibold tracking-tight text-[var(--foreground)]">Trip report</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[var(--card)] shadow-sm hover:opacity-90"
                  >
                    Print or save as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[13px] text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Close
                  </button>
                </div>
              </div>
              <p className="border-b border-[var(--border)] px-6 py-2.5 text-[12px] uppercase tracking-wider text-[var(--muted)]">
                Use Print → Save as PDF for a clean copy.
              </p>
              <div id="trip-report-printable" className="overflow-y-auto p-8 text-[15px] leading-relaxed max-w-none">
                <div className="border-b border-[var(--border)] pb-6">
                  <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">{plan.trip.recommended_region}</h1>
                  <p className="mt-2 text-lg italic text-[var(--muted)]">{plan.trip.title}</p>
                  <p className="mt-4 text-[var(--foreground)]/90">{plan.trip.summary}</p>
                  <p className="mt-3 text-[13px] text-[var(--muted)]">{plan.trip.best_season} · {plan.trip.pace}{plan.trip.vibe_tags?.length ? ` · ${plan.trip.vibe_tags.join(", ")}` : ""}</p>
                </div>
                {lastUsedPrefs && (
                  <div className="mt-6 border-b border-[var(--border)] pb-6">
                    <h2 className="font-heading text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Parameters</h2>
                    <ul className="mt-3 space-y-1 text-[14px] text-[var(--muted)]">
                      <li><span className="text-[var(--foreground)]">Vibes:</span> {lastUsedPrefs.vibes}</li>
                      <li><span className="text-[var(--foreground)]">{lastUsedPrefs.days} days</span> · {PRICINESS_LABELS[lastUsedPrefs.priciness - 1]}</li>
                      {lastUsedPrefs.origin && <li><span className="text-[var(--foreground)]">Origin:</span> {lastUsedPrefs.origin}</li>}
                      {lastUsedPrefs.tripStory && <li><span className="text-[var(--foreground)]">Notes:</span> {lastUsedPrefs.tripStory}</li>}
                    </ul>
                  </div>
                )}
                <div className="mt-6">
                  <h2 className="font-heading text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Itinerary</h2>
                  {plan.itinerary?.map((d) => (
                    <div key={d.day} className="mt-4 rounded-lg border border-[var(--border)]/60 bg-[var(--muted-bg)]/20 p-4">
                      <p className="font-semibold text-[var(--foreground)]">Day {d.day}: {d.base_location}</p>
                      <ul className="mt-3 space-y-2 text-[14px] text-[var(--muted)]">
                        {d.blocks.map((b) => (
                          <li key={b.id} className="flex gap-2">
                            <span className="shrink-0 w-8 text-[var(--foreground)]/70">{b.time === "morning" ? "AM" : b.time === "afternoon" ? "PM" : "Eve"}</span>
                            <span><strong className="text-[var(--foreground)]">{b.title}</strong>{b.notes ? ` — ${b.notes}` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {buildGoogleMapsUrl(plan, lastUsedPrefs?.origin) && (
                  <p className="mt-6 text-[13px] text-[var(--muted)]">
                    Map: <a href={buildGoogleMapsUrl(plan, lastUsedPrefs?.origin)} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">Open in Google Maps</a>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {copySuccess && (
          <div className="atlas-toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[var(--accent)]/40 bg-[var(--card)] px-5 py-3 text-[14px] font-medium text-[var(--foreground)] shadow-lg" role="status" aria-live="polite">
            Copied. Paste into your AI assistant to refine further.
          </div>
        )}

        {step === "universe" && (
        <div className="flex flex-col gap-8">
          {/* Compact top bar: navigation + save/share/my trips */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/40 px-5 py-4">
            <p className="w-full text-[13px] text-[var(--muted)]/80 md:w-auto md:max-w-sm">Your itinerary, your way. Drag to reorder, Swap to replace. Use the Copilot to refine anything—then save, share, or export.</p>
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
                  <button
                    type="button"
                    onClick={() => { fetchTrips(); setMyTripsOpen(true); }}
                    disabled={loadingTrips}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    {loadingTrips ? "Loading…" : "My trips"}
                  </button>
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
                    <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 shadow-lg">
                      <p className="px-4 pb-2 text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">Export</p>
                      <button
                        type="button"
                        onClick={copySummaryForAI}
                        className="w-full px-4 py-3 text-left text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--muted-bg)]/50 transition-colors"
                      >
                        Copy for AI
                      </button>
                      <p className="px-4 text-[12px] text-[var(--muted)]/90">Markdown summary to paste into ChatGPT or Claude.</p>
                      <button
                        type="button"
                        onClick={downloadJson}
                        className="w-full px-4 py-3 text-left text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--muted-bg)]/50 transition-colors"
                      >
                        Download JSON
                      </button>
                      <p className="px-4 text-[12px] text-[var(--muted)]/90">Full trip data for backup or integration.</p>
                      <button
                        type="button"
                        onClick={() => { setExportOpen(false); setCalendarModalOpen(true); if (!calendarStartDate) setCalendarStartDate(new Date().toISOString().slice(0, 10)); }}
                        className="mt-2 w-full px-4 py-3 text-left text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--muted-bg)]/50 transition-colors"
                      >
                        Add to calendar
                      </button>
                      <p className="px-4 text-[12px] text-[var(--muted)]/90">Download .ics for Outlook, Apple Calendar, Google.</p>
                      <button
                        type="button"
                        onClick={() => { setExportOpen(false); setReportOpen(true); }}
                        className="mt-2 w-full px-4 py-3 text-left text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--muted-bg)]/50 transition-colors"
                      >
                        Trip report
                      </button>
                      <p className="px-4 text-[12px] text-[var(--muted)]/90">Print or save as PDF.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <section className="min-h-0 rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 md:p-10 lg:p-12">
            {plan ? (
              <div className="max-w-[900px]">
                {tripPhoto?.url && (
                  <div className="mb-14 overflow-hidden rounded-xl">
                    <img
                      src={tripPhoto.url}
                      alt={tripPhoto.alt}
                      className="h-72 w-full object-cover md:h-80"
                    />
                    <p className="mt-2 text-right text-[12px] text-[var(--muted)]">Photo: Unsplash</p>
                  </div>
                )}
                <h2 className="font-heading text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">{plan.trip.recommended_region}</h2>
                <p className="mt-3 text-xl italic text-[var(--muted)]">{plan.trip.title}</p>
                <p className="mt-6 text-[16px] leading-relaxed text-[var(--muted)]">{plan.trip.summary}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="text-[13px] text-[var(--muted)]">{plan.trip.best_season} · {plan.trip.pace}</span>
                  {plan.trip.vibe_tags?.map((t) => (
                    <span key={t} className="text-[12px] text-[var(--muted)]">#{t}</span>
                  ))}
                </div>

                {(() => {
                  const ctx = getDestinationContext(plan.trip.recommended_region ?? "");
                  if (!ctx) return null;
                  return (
                    <details className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/30 overflow-hidden">
                      <summary className="cursor-pointer list-none px-5 py-4 text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--muted-bg)]/50">
                        About this destination
                      </summary>
                      <div className="border-t border-[var(--border)] px-5 py-5 space-y-5 text-[14px]">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">When to go</p>
                          <p className="mt-1 text-[var(--muted)]">{ctx.bestTime}</p>
                          <p className="mt-1 text-[13px] text-[var(--muted)]">{ctx.bestTimeWhy}</p>
                        </div>
                        <div>
                          <p className="font-medium text-[var(--foreground)]">Must-sees</p>
                          <ul className="mt-2 space-y-1.5">
                            {ctx.topSights.map((s, i) => (
                              <li key={i} className="text-[var(--muted)]">
                                <span className="text-[var(--foreground)]">{s.name}</span>
                                {s.why && <span> — {s.why}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </details>
                  );
                })()}

                <div className="mt-12 flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-8">
                  <span className="text-[13px] font-medium uppercase tracking-wider text-[var(--muted)]">View</span>
                  <button
                    type="button"
                    onClick={() => setUniverseView("timeline")}
                    className={`rounded-lg px-4 py-2.5 text-[13px] ${universeView === "timeline" ? "bg-[var(--accent)] text-[var(--card)]" : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                  >
                    Timeline
                  </button>
                  <button
                    type="button"
                    onClick={() => setUniverseView("calendar")}
                    className={`rounded-lg px-4 py-2.5 text-[13px] ${universeView === "calendar" ? "bg-[var(--accent)] text-[var(--card)]" : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                  >
                    Calendar
                  </button>
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/50 px-3 py-2.5 text-[13px] text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                    aria-label="Filter by activity type"
                  >
                    <option value="">All activities</option>
                    {["food", "nature", "culture", "nightlife", "relax", "logistics"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <GoogleMapsLink plan={plan} origin={lastUsedPrefs?.origin} />
                    <button
                      type="button"
                      onClick={() => setCopilotOpen((v) => !v)}
                      className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-medium text-[var(--card)] hover:opacity-90"
                    >
                      {copilotOpen ? "Hide Copilot" : "AI Copilot"}
                    </button>
                  </div>
                </div>

                <p className="mt-6 text-[14px] text-[var(--muted)]">
                  Drag to reorder, click to edit, Swap to try another spot. Use the Copilot to refine the whole plan.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-[var(--muted)]">Quick edits:</span>
                  <button
                    type="button"
                    onClick={() => sendCopilotMessage("Make the trip more expensive / upscale")}
                    disabled={copilotLoading}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
                  >
                    More expensive
                  </button>
                  <button
                    type="button"
                    onClick={() => sendCopilotMessage("Make the trip less expensive / budget-friendly")}
                    disabled={copilotLoading}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
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
                  <div className="mt-10 w-full space-y-14 pb-16">
                    {plan.itinerary?.map((d) => (
                      <div key={d.day} className="border-b border-[var(--border)] pb-14 last:border-b-0 last:pb-0">
                        <div className="mb-8">
                          <p className="text-[12px] font-medium uppercase tracking-widest text-[var(--muted)]">Day {d.day}</p>
                          <p className="mt-1 font-heading text-2xl font-medium tracking-tight text-[var(--foreground)]">{d.base_location}</p>
                        </div>
                        <div className="space-y-10">
                          {TIME_SLOTS.map((time) => (
                            <div key={time} className="space-y-4">
                              <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--muted)]">
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
                      </div>
                    ))}
                  </div>
                  )}
                  {universeView === "calendar" && plan.itinerary && (() => {
                    const start = calendarStartDate ? new Date(calendarStartDate + "T12:00:00") : new Date();
                    const daysInTrip = plan.itinerary.length;
                    const weekStartsOnMonday = true;
                    const dayLabels = weekStartsOnMonday ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    const year = start.getFullYear();
                    const month = start.getMonth();
                    const firstOfMonth = new Date(year, month, 1);
                    let firstCell = new Date(firstOfMonth);
                    const dow = firstOfMonth.getDay();
                    const offset = weekStartsOnMonday ? (dow === 0 ? 6 : dow - 1) : dow;
                    firstCell.setDate(firstCell.getDate() - offset);
                    const cells: { date: Date; dayNum: number | null; location: string; blocks: number }[] = [];
                    const totalCells = 42;
                    for (let i = 0; i < totalCells; i++) {
                      const d = new Date(firstCell);
                      d.setDate(firstCell.getDate() + i);
                      const tripDayIndex = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
                      const inRange = tripDayIndex >= 0 && tripDayIndex < daysInTrip;
                      const dayNum = inRange ? tripDayIndex + 1 : null;
                      const loc = inRange ? plan.itinerary[tripDayIndex].base_location : "";
                      const blocks = inRange ? plan.itinerary[tripDayIndex].blocks.length : 0;
                      cells.push({ date: d, dayNum, location: loc, blocks });
                    }
                    const monthTitle = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                    return (
                      <div className="mt-10 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/20 pb-16">
                        <p className="border-b border-[var(--border)] bg-[var(--muted-bg)]/50 px-4 py-4 text-center font-heading text-base font-medium text-[var(--foreground)]">{monthTitle}</p>
                        <div className="grid grid-cols-7 text-[12px]">
                          {dayLabels.map((label) => (
                            <div key={label} className="border-b border-r border-[var(--border)]/60 py-3 text-center font-medium text-[var(--muted)] last:border-r-0">
                              {label}
                            </div>
                          ))}
                          {cells.map((c, i) => (
                            <div
                              key={i}
                              className={`min-h-[84px] border-b border-r border-[var(--border)]/60 p-3 last:border-r-0 ${c.dayNum != null ? "bg-[var(--accent-soft)]/50" : "bg-[var(--card)]/30"}`}
                            >
                              <span className={c.dayNum != null ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)]"}>{c.date.getDate()}</span>
                              {c.dayNum != null && (
                                <>
                                  <p className="mt-1 truncate text-[11px] font-medium text-[var(--foreground)]">Day {c.dayNum}</p>
                                  <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{c.location}</p>
                                  <p className="mt-1 text-[10px] text-[var(--muted)]">{c.blocks} activities</p>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <DragOverlay>
                    {activeBlock ? (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg ring-2 ring-[var(--accent)]/20">
                        <div className="text-[16px] font-medium text-[var(--foreground)]">{activeBlock.title}</div>
                        {activeBlock.notes ? (
                          <div className="mt-2 text-[14px] text-[var(--muted)]">{activeBlock.notes}</div>
                        ) : null}
                        <span className="mt-3 inline-block rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-2.5 py-1 text-[12px] text-[var(--muted)]">
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
      className={`min-h-[88px] rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/30 p-5 transition-colors duration-200 ${
        isOver ? "border-[var(--accent)]/60 bg-[var(--muted-bg)]/60" : ""
      }`}
      aria-label={`Day ${day}, ${title}`}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ul className="space-y-4 text-[15px] text-[var(--muted)]">
          {items.length === 0 ? (
            <li className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-[13px] text-[var(--muted)]">
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
      className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-shadow ${
        isDragging ? "opacity-95 shadow-md ring-2 ring-[var(--accent)]/30" : "hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className="mt-1.5 shrink-0 cursor-grab touch-none rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--muted-bg)] active:cursor-grabbing"
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
              className="mt-0.5 w-full rounded-lg text-left text-[16px] font-medium leading-snug text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
              className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/50 px-3 py-2.5 text-[14px] outline-none focus:border-[var(--accent)] resize-none"
              rows={2}
              autoFocus
              aria-label="Edit activity notes"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingNotes(true)}
              className={`mt-3 block w-full rounded-lg text-left text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${!block.notes ? "italic text-[var(--muted)]" : "text-[var(--muted)]"}`}
            >
              {block.notes || "Add notes…"}
            </button>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
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
