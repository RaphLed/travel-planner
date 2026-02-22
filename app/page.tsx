"use client";

import { useMemo, useState } from "react";

type DayPlan = {
  day: number;
  morning: string[];
  afternoon: string[];
  evening: string[];
};

type PlanResponse = {
  title: string;
  summary: string;
  days: DayPlan[];
};

export default function Home() {
  const [vibes, setVibes] = useState("space, solitude, nature, sun");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);

  const canGenerate = useMemo(() => vibes.trim().length > 0 && days >= 1, [vibes, days]);

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
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Travel Planner</h1>
          <p className="mt-2 text-neutral-300">
            Local prototype: vibes → AI itinerary → (next) drag-and-drop timeline.
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
              Next: convert this into a horizontal timeline with drag-and-drop.
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
                <h2 className="text-2xl font-semibold">{plan.title}</h2>
                <p className="mt-2 text-neutral-300">{plan.summary}</p>

                <div className="mt-6 space-y-4">
                  {plan.days?.map((d) => (
                    <div key={d.day} className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-4">
                      <h3 className="text-lg font-medium mb-3">Day {d.day}</h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <TimeBlock title="Morning" items={d.morning} />
                        <TimeBlock title="Afternoon" items={d.afternoon} />
                        <TimeBlock title="Evening" items={d.evening} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function TimeBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
      <p className="text-sm font-medium text-neutral-100">{title}</p>
      <ul className="mt-2 space-y-2 text-sm text-neutral-300">
        {(items ?? []).length === 0 ? (
          <li className="text-neutral-500">—</li>
        ) : (
          items.map((x, i) => (
            <li key={i} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-2">
              {x}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}