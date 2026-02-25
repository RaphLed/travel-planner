import { getSupabase } from "@/lib/supabase";
import {
  normalizePreferences,
  PRICINESS_LABELS,
  type TripPreferences,
} from "@/lib/trip-preferences";
import type { PlanResponse } from "@/lib/types";
import { createHash } from "crypto";
import OpenAI from "openai";

const CATEGORIES = [
  "City break",
  "Nature & wildlife",
  "Beach & sun",
  "Culture & history",
] as const;
const PER_CATEGORY = 3;
const TOTAL_ALTERNATIVES = CATEGORIES.length * PER_CATEGORY; // 12

function inputHash(prefs: TripPreferences): string {
  return createHash("sha256").update(JSON.stringify(prefs)).digest("hex");
}

function buildPrompt(prefs: TripPreferences): string {
  const days = prefs.days;
  const vibes = prefs.vibes;
  const priceLabel = PRICINESS_LABELS[Math.min(prefs.priciness - 1, 4)] ?? "Moderate";
  const structure = prefs.tripStructure === "multi"
    ? "Multi-location trip (several stops, e.g. safari + beach, or city hop)."
    : "Single-location trip (one city or region as base).";
  const parts: string[] = [
    `Create exactly ${TOTAL_ALTERNATIVES} trip ideas in 4 categories: ${CATEGORIES.join(", ")}. ${PER_CATEGORY} distinct trips per category.`,
    `${days}-day trip. ${structure}`,
    `Vibes/keywords: ${vibes}.`,
    `Budget: ${priceLabel} (${prefs.priciness}/5).`,
  ];
  if (prefs.origin.trim()) parts.push(`Depart from: ${prefs.origin.trim()}.`);
  if (prefs.maxTravelTimeHours < 24) parts.push(`Max one-way travel: ${prefs.maxTravelTimeHours}h.`);
  if (prefs.transportation && prefs.transportation !== "any") parts.push(`Transport: ${prefs.transportation}.`);
  if (prefs.constraints.trim()) parts.push(`Constraints: ${prefs.constraints.trim()}.`);
  if (prefs.emphasis.length > 0) parts.push(`Emphasis: ${prefs.emphasis.join(", ")}.`);
  if (prefs.theme && prefs.theme !== "none") parts.push(`Theme: ${prefs.theme}.`);
  if (prefs.weather && prefs.weather !== "any") parts.push(`Weather: ${prefs.weather}.`);
  if (prefs.weatherDetail) {
    const w = prefs.weatherDetail;
    if (w.tempMinC != null || w.tempMaxC != null) parts.push(`Temperature range: ${w.tempMinC ?? "any"}–${w.tempMaxC ?? "any"} °C.`);
    if (w.maxRainfallMm != null) parts.push(`Max rainfall: ${w.maxRainfallMm} mm.`);
    if (w.maxUvIndex != null) parts.push(`Max UV index: ${w.maxUvIndex}.`);
  }
  if (prefs.tripStory?.trim()) parts.push(`Notes (prioritise): ${prefs.tripStory.trim()}.`);
  return parts.join(" ");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prefs = normalizePreferences(body);
    const hash = inputHash(prefs);

    const supabase = getSupabase();
    if (supabase) {
      const { data: cached } = await supabase
        .from("plan_cache")
        .select("payload")
        .eq("input_hash", hash)
        .single();
      if (cached?.payload && typeof cached.payload === "object") {
        const c = cached.payload as { alternatives?: PlanResponse[]; categories?: { name: string; alternatives: PlanResponse[] }[] };
        const list = Array.isArray(c.alternatives) ? c.alternatives : (Array.isArray(c.categories) ? c.categories.flatMap((cat) => cat.alternatives || []) : []);
        if (list.length >= TOTAL_ALTERNATIVES) {
          return new Response(JSON.stringify(cached.payload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = new OpenAI({ apiKey });
    const promptText = buildPrompt(prefs);

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      text: { format: { type: "json_object" } },
      input: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON. No markdown. No code fences. You MUST output 4 categories, each with exactly 3 trip alternatives. " +
            "Each alternative must have trip (title, summary, vibe_tags, recommended_region, best_season, pace) and itinerary (array of day objects with base_location and blocks). " +
            "Use real places and concrete activities. Block ids unique, format d{day}-{m|a|e}-{i}-{catIndex}-{altIndex}.",
        },
        {
          role: "user",
          content: `${promptText}

Return JSON (no markdown, no code fences):

{
  "categories": [
    {
      "name": "City break",
      "alternatives": [
        {
          "trip": { "title": "...", "summary": "...", "vibe_tags": [], "recommended_region": "...", "best_season": "...", "pace": "slow|moderate|fast" },
          "itinerary": [ { "day": 1, "base_location": "...", "blocks": [ { "id": "d1-m-1-0-0", "time": "morning|afternoon|evening", "title": "...", "type": "food|nature|culture|nightlife|relax|logistics", "notes": "" } ] } ]
        }
      ]
    },
    { "name": "Nature & wildlife", "alternatives": [ ... 3 ... ] },
    { "name": "Beach & sun", "alternatives": [ ... 3 ... ] },
    { "name": "Culture & history", "alternatives": [ ... 3 ... ] }
  ]
}

Rules:
- Exactly 4 categories with these exact names: City break, Nature & wildlife, Beach & sun, Culture & history.
- Each category has exactly 3 alternatives. Each alternative is a full trip with trip + itinerary.
- Each itinerary has exactly ${prefs.days} days. Each day has 2–4 blocks per time. base_location is a real place name.
- Respect single vs multi-location: single = one base; multi = multiple stops/lodges/regions.
- Block ids unique. Use format d{day}-{m|a|e}-{index}-{catIdx}-{altIdx}.`,
        },
      ],
    });

    if (response.error) {
      return new Response(
        JSON.stringify({ error: response.error.message ?? "Model error" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const raw = response.output_text?.trim() ?? "";
    if (!raw) {
      return new Response(
        JSON.stringify({ error: "Empty model response" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(raw) as { categories?: { name: string; alternatives?: unknown[] }[] };
    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const alternatives: PlanResponse[] = [];
    for (const cat of categories) {
      const list = Array.isArray(cat.alternatives) ? cat.alternatives.slice(0, PER_CATEGORY) : [];
      for (const alt of list) {
        if (alt && typeof alt === "object" && (alt as PlanResponse).trip && Array.isArray((alt as PlanResponse).itinerary)) {
          alternatives.push(alt as PlanResponse);
        }
      }
    }

    const data = {
      categories: categories.map((c) => ({
        name: c.name || "",
        alternatives: (Array.isArray(c.alternatives) ? c.alternatives : []).slice(0, PER_CATEGORY) as PlanResponse[],
      })).filter((c) => c.alternatives.length > 0),
      alternatives: alternatives.slice(0, TOTAL_ALTERNATIVES),
    };

    if (supabase) {
      await supabase.from("plan_cache").upsert(
        {
          input_hash: hash,
          vibes: prefs.vibes,
          days: prefs.days,
          payload: data,
        },
        { onConflict: "input_hash" }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
