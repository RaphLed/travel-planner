import { getSupabase } from "@/lib/supabase";
import {
  normalizePreferences,
  PRICINESS_LABELS,
  type TripPreferences,
} from "@/lib/trip-preferences";
import type { PlanResponse } from "@/lib/types";
import { createHash } from "crypto";
import OpenAI from "openai";

const NUM_ALTERNATIVES = 3;

function inputHash(prefs: TripPreferences): string {
  return createHash("sha256").update(JSON.stringify(prefs)).digest("hex");
}

function buildPrompt(prefs: TripPreferences): string {
  const days = prefs.days;
  const vibes = prefs.vibes;
  const priceLabel = PRICINESS_LABELS[Math.min(prefs.priciness - 1, 4)] ?? "Moderate";
  const parts: string[] = [
    `Create ${NUM_ALTERNATIVES} different ${days}-day trip ideas. Consider destinations worldwide.`,
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
  if (prefs.tripStory?.trim()) parts.push(`Trip story or specific preferences (prioritise this): ${prefs.tripStory.trim()}.`);

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
        const c = cached.payload as { alternatives?: PlanResponse[] };
        if (Array.isArray(c.alternatives) && c.alternatives.length > 0) {
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
            "Return ONLY valid JSON. No markdown. No code fences. Must match the schema. You MUST output exactly " + NUM_ALTERNATIVES + " distinct trip alternatives. " +
            "Recommend real, specific destinations and activities worldwide. Be actionable and concrete: name real places, landmarks, neighbourhoods, and proven itineraries. Avoid generic or high-level fluff.",
        },
        {
          role: "user",
          content: `${promptText}

Return JSON with this exact structure (no markdown, no code fences):

{
  "alternatives": [
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
  ]
}

Rules:
- You MUST include exactly ${NUM_ALTERNATIVES} objects in "alternatives". Each alternative must be a COMPLETELY DIFFERENT trip (different region/country or theme). Consider worldwide options.
- Be specific and actionable: use real place names, real activities, and proven trip structures. No vague or generic recommendations.
- Each alternative MUST have "trip" and "itinerary". Each itinerary MUST have exactly ${prefs.days} day objects.
- Block ids must be unique across the whole response. Use format: d{day}-{m|a|e}-{index}-{altIndex} e.g. d1-m-1-0 for first alternative, d1-m-1-1 for second.
- Each day should have 2–4 blocks per time period. "base_location" should be a real town/neighbourhood. Respect origin, max travel time, budget, constraints, and theme.`,
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

    const parsed = JSON.parse(raw) as { alternatives?: unknown[] };
    const alternatives = Array.isArray(parsed.alternatives) ? parsed.alternatives : [];
    if (alternatives.length === 0) {
      return new Response(
        JSON.stringify({ error: "No alternatives returned" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = { alternatives: alternatives.slice(0, NUM_ALTERNATIVES) as PlanResponse[] };

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
