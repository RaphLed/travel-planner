"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
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
import { useMemo, useState } from "react";

type Block = {
  id: string;
  time: "morning" | "afternoon" | "evening";
  title: string;
  type: "food" | "nature" | "culture" | "nightlife" | "relax" | "logistics";
  notes: string;
};

type Day = {
  day: number;
  base_location: string;
  blocks: Block[];
};

type PlanResponse = {
  trip: {
    title: string;
    summary: string;
    vibe_tags: string[];
    recommended_region: string;
    best_season: string;
    pace: "slow" | "moderate" | "fast";
  };
  itinerary: Day[];
};

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

export default function Home() {
  const [vibes, setVibes] = useState("space, solitude, nature, sun");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);

  const canGenerate = useMemo(() => vibes.trim().length > 0 && days >= 1, [vibes, days]);

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
        body: JSON.stringify({ vibes, days }),
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
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

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Travel Planner</h1>
          <p className="mt-2 text-neutral-300">
            Local prototype: vibes → AI itinerary → drag-and-drop timeline.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Inputs */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            <h2 className="text-lg font-medium">Trip input</h2>

            <label className="mt-4 block text-sm text-neutral-300" htmlFor="vibes">
              Vibes / keywords
            </label>
            <textarea
              id="vibes"
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 text-sm outline-none focus:ring-2 focus:ring-neutral-500"
              rows={4}
              value={vibes}
              onChange={(e) => setVibes(e.target.value)}
              placeholder="e.g. warm, sea, street food, architecture, calm"
            />

            <label className="mt-4 block text-sm text-neutral-300" htmlFor="days">
              Duration (days)
            </label>
            <input
              id="days"
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 text-sm outline-none focus:ring-2 focus:ring-neutral-500"
            />

            <button
              onClick={generate}
              disabled={!canGenerate || loading}
              className="mt-5 w-full rounded-xl bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
              aria-busy={loading}
            >
              {loading ? "Generating…" : "Generate itinerary"}
            </button>

            {error && (
              <p className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <p className="mt-4 text-xs text-neutral-400">
              Drag activity blocks between days and time slots to reorder.
            </p>
          </section>

          {/* Output */}
          <section className="md:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
            {!plan ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-6 text-neutral-300">
                <p className="text-sm">
                  No plan yet. Enter vibes and click <span className="text-neutral-50">Generate itinerary</span>.
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-semibold">{plan.trip.title}</h2>
                <p className="mt-2 text-neutral-300">{plan.trip.summary}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-neutral-800 bg-neutral-950/50 px-3 py-1 text-neutral-200">
                    Region: {plan.trip.recommended_region}
                  </span>
                  <span className="rounded-full border border-neutral-800 bg-neutral-950/50 px-3 py-1 text-neutral-200">
                    Season: {plan.trip.best_season}
                  </span>
                  <span className="rounded-full border border-neutral-800 bg-neutral-950/50 px-3 py-1 text-neutral-200">
                    Pace: {plan.trip.pace}
                  </span>

                  {plan.trip.vibe_tags?.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-neutral-800 bg-neutral-950/30 px-3 py-1 text-neutral-300"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="mt-6 space-y-4">
                    {plan.itinerary?.map((d) => (
                      <div
                        key={d.day}
                        className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-4"
                      >
                        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <h3 className="text-lg font-medium">Day {d.day}</h3>
                          <span className="text-sm text-neutral-400">
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
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
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
}: {
  day: number;
  time: TimeSlot;
  title: string;
  items: Block[];
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
      className={`rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 transition-colors ${
        isOver ? "border-neutral-600 bg-neutral-900/60" : ""
      }`}
      aria-label={`Day ${day}, ${title}`}
    >
      <p className="text-sm font-medium text-neutral-100">{title}</p>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ul className="mt-2 space-y-2 text-sm text-neutral-300">
          {items.length === 0 ? (
            <li className="rounded-lg border border-dashed border-neutral-700 py-4 text-center text-neutral-500">
              Drop here
            </li>
          ) : (
            items.map((b) => (
              <SortableBlock key={b.id} block={b} />
            ))
          )}
        </ul>
      </SortableContext>
    </div>
  );
}

function SortableBlock({ block }: { block: Block }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-neutral-800 bg-neutral-950/60 p-2 ${
        isDragging ? "opacity-80 shadow-lg ring-2 ring-neutral-500" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex flex-1 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder: ${block.title}`}
        >
          <div className="text-neutral-100">{block.title}</div>
          {block.notes ? (
            <div className="mt-1 text-xs text-neutral-400">{block.notes}</div>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full border border-neutral-800 bg-neutral-950/50 px-2 py-0.5 text-[11px] text-neutral-300">
          {block.type}
        </span>
      </div>
    </li>
  );
}
