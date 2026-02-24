"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanResponse } from "@/lib/types";
import type { Block } from "@/lib/types";

export default function ShareTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [trip, setTrip] = useState<PlanResponse & { shareRole?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const updateBlock = useCallback((dayIndex: number, blockId: string, updates: Partial<Pick<Block, "title" | "notes">>) => {
    if (!trip?.itinerary) return;
    setTrip({
      ...trip,
      itinerary: trip.itinerary.map((d, i) =>
        i !== dayIndex
          ? d
          : {
              ...d,
              blocks: d.blocks.map((b) =>
                b.id !== blockId ? b : { ...b, ...updates }
              ),
            }
      ),
    });
  }, [trip]);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Link not found or expired");
        return res.json();
      })
      .then((data: PlanResponse & { shareRole?: string }) => {
        setTrip(data);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setTrip(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const saveChanges = useCallback(() => {
    if (!token || !trip || trip.shareRole !== "editor") return;
    setSaving(true);
    setSaveMessage(null);
    const payload: PlanResponse = { trip: trip.trip, itinerary: trip.itinerary ?? [] };
    fetch(`/api/share/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save");
        setSaveMessage("Saved.");
      })
      .catch(() => setSaveMessage("Failed to save."))
      .finally(() => setSaving(false));
  }, [token, trip]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[15px] text-[var(--muted)]">
        Loading shared trip…
      </main>
    );
  }
  if (error || !trip) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--background)] p-8">
        <p className="text-[var(--muted)]">{error ?? "Trip not found"}</p>
        <a href="/" className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-[14px] font-medium text-[var(--card)]">
          Go home
        </a>
      </main>
    );
  }

  const isEditor = trip.shareRole === "editor";
  const payload = trip as PlanResponse;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-medium tracking-tight sm:text-3xl">{payload.trip.recommended_region}</h1>
            <p className="mt-2 text-lg italic text-[var(--muted)]">{payload.trip.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-[var(--muted)]">
              {isEditor ? "You can edit" : "View only"}
            </span>
            {isEditor && (
              <>
                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={saving}
                  className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 text-[14px] font-medium text-[var(--card)] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {saveMessage && (
                  <span className="text-[14px] text-[var(--muted)]">{saveMessage}</span>
                )}
              </>
            )}
            <a
              href="/"
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-[14px] text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Go to Travel Planner
            </a>
          </div>
        </div>

        <p className="text-[15px] leading-relaxed text-[var(--muted)]">{payload.trip.summary}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-[14px] text-[var(--muted)]">
          {payload.trip.best_season} · {payload.trip.pace}
          {payload.trip.vibe_tags?.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>

        <div className="mt-14">
          <h2 className="font-heading text-xl font-medium text-[var(--foreground)]">Itinerary</h2>
          <div className="mt-6 space-y-10">
            {payload.itinerary?.map((d, dayIndex) => (
              <div key={d.day} className="border-b border-[var(--border)] pb-8">
                <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--muted)]">Day {d.day}</p>
                <p className="mt-1 font-heading text-[16px] text-[var(--foreground)]">{d.base_location}</p>
                <ul className="mt-4 space-y-3">
                  {d.blocks.map((b) => (
                    <li key={b.id} className="flex flex-col gap-1.5 text-[14px]">
                      <span className="text-[var(--muted)]">
                        {b.time === "morning" ? "AM" : b.time === "afternoon" ? "PM" : "Eve"}:
                      </span>
                      {isEditor ? (
                        <>
                          <input
                            type="text"
                            value={b.title}
                            onChange={(e) => updateBlock(dayIndex, b.id, { title: e.target.value })}
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--card)]/50 px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                          />
                          <input
                            type="text"
                            value={b.notes ?? ""}
                            onChange={(e) => updateBlock(dayIndex, b.id, { notes: e.target.value })}
                            placeholder="Notes (optional)"
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--card)]/50 px-3 py-2 text-[13px] text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                          />
                        </>
                      ) : (
                        <>
                          <span className="text-[var(--foreground)]">{b.title}</span>
                          {b.notes && (
                            <span className="text-[var(--muted)]">— {b.notes}</span>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
