import { getSupabase } from "@/lib/supabase";
import {
  normalizePreferences,
  PRICINESS_LABELS,
  type TripPreferences,
} from "@/lib/trip-preferences";
import { createHash } from "crypto";
import OpenAI from "openai";

function inputHash(prefs: TripPreferences): string {
  return createHash("sha256").update(JSON.stringify(prefs)).digest("hex");
}

function buildPrompt(prefs: TripPreferences): string {
  const days = prefs.days;
  const vibes = prefs.vibes;
  const priceLabel = PRICINESS_LABELS[Math.min(prefs.priciness - 1, 4)] ?? "Moderate";
  const parts: string[] = [
    `Create a ${days}-day trip idea.`,
    `Vibes/keywords: ${vibes}.`,
    `Budget level: ${priceLabel} (${prefs.priciness}/5).`,
  ];
  if (prefs.origin.trim()) parts.push(`Travellers depart from: ${prefs.origin.trim()}.`);
  if (prefs.maxTravelTimeHours < 24) parts.push(`Maximum one-way travel time: ${prefs.maxTravelTimeHours} hours.`);
  if (prefs.transportation && prefs.transportation !== "any") parts.push(`Preferred transport: ${prefs.transportation}.`);
  if (prefs.constraints.trim()) parts.push(`Constraints/requirements: ${prefs.constraints.trim()}.`);
  if (prefs.emphasis.length > 0) parts.push(`Emphasis: ${prefs.emphasis.join(", ")}.`);
  if (prefs.theme && prefs.theme !== "none") parts.push(`Trip theme: ${prefs.theme}.`);
  if (prefs.weather && prefs.weather !== "any") parts.push(`Weather preference: ${prefs.weather}.`);

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
        return new Response(JSON.stringify(cached.payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
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
            "Return ONLY valid JSON. No markdown. No code fences. Must match the schema.",
        },
        {
          role: "user",
          content: `${promptText}

Return JSON with this exact structure (no markdown, no code fences):

{
  "trip": {
    "title": "string",
    "summary": "string",
    "vibe_tags": ["string"],
    "recommended_region": "string",
    "best_season": "string",
    "pace": "slow|moderate|fast"
  },
  "itinerary": [
    {
      "day": 1,
      "base_location": "string",
      "blocks": [
        {
          "id": "d1-m-1",
          "time": "morning|afternoon|evening",
          "title": "string",
          "type": "food|nature|culture|nightlife|relax|logistics",
          "notes": "string"
        }
      ]
    }
  ]
}

Rules:
- You MUST include exactly ${prefs.days} day objects in "itinerary".
- Each "blocks" item MUST have a unique id. Use the format: d{day}-{m|a|e}-{index}, e.g. d3-a-2.
- Each day should have 2–4 blocks per time period (morning/afternoon/evening) unless the vibe implies slower pace.
- "base_location" should be a realistic place (city/town/region). Respect origin and max travel time when suggesting region.
- "notes" should be short and practical (1–2 sentences). Respect budget level, constraints, and theme in your suggestions.`,
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

    const data = JSON.parse(raw) as { trip: unknown; itinerary: unknown };

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
