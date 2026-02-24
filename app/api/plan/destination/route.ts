import {
  normalizePreferences,
  PRICINESS_LABELS,
  type TripPreferences,
} from "@/lib/trip-preferences";
import type { PlanResponse } from "@/lib/types";
import OpenAI from "openai";

function buildSingleDestinationPrompt(prefs: TripPreferences, destination: string): string {
  const days = prefs.days;
  const vibes = prefs.vibes;
  const priceLabel = PRICINESS_LABELS[Math.min(prefs.priciness - 1, 4)] ?? "Moderate";
  const parts: string[] = [
    `Create exactly ONE ${days}-day trip for the city/region: ${destination}.`,
    `Vibes/keywords: ${vibes}.`,
    `Budget level: ${priceLabel} (${prefs.priciness}/5).`,
  ];
  if (prefs.origin.trim()) parts.push(`Travellers depart from: ${prefs.origin.trim()}.`);
  if (prefs.constraints.trim()) parts.push(`Constraints: ${prefs.constraints.trim()}.`);
  if (prefs.emphasis.length > 0) parts.push(`Emphasis: ${prefs.emphasis.join(", ")}.`);
  if (prefs.theme && prefs.theme !== "none") parts.push(`Trip theme: ${prefs.theme}.`);
  if (prefs.weather && prefs.weather !== "any") parts.push(`Weather preference: ${prefs.weather}.`);
  if (prefs.tripStory?.trim()) parts.push(`Additional preferences: ${prefs.tripStory.trim()}.`);
  return parts.join(" ");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prefs = normalizePreferences(body.prefs ?? body);
    const destination =
      typeof body.destination === "string" && body.destination.trim()
        ? body.destination.trim()
        : null;
    if (!destination) {
      return new Response(
        JSON.stringify({ error: "Missing destination" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = new OpenAI({ apiKey });
    const promptText = buildSingleDestinationPrompt(prefs, destination);

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      text: { format: { type: "json_object" } },
      input: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON. No markdown. No code fences. You must output a single trip for the given destination with trip and itinerary. Use real places and activities in that city/region. Block ids must be unique, format: d{day}-{m|a|e}-{index}.",
        },
        {
          role: "user",
          content: `${promptText}

Return JSON with this exact structure (no markdown, no code fences):

{
  "trip": {
    "title": "string (short trip title)",
    "summary": "string",
    "vibe_tags": ["string"],
    "recommended_region": "string (must be ${destination})",
    "best_season": "string",
    "pace": "slow|moderate|fast"
  },
  "itinerary": [
    {
      "day": 1,
      "base_location": "string (neighbourhood or area name)",
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
- recommended_region MUST be "${destination}" or a clear variant (e.g. "Paris, France").
- Exactly ${prefs.days} day objects in itinerary.
- Each day 2–4 blocks per time period. Real, specific venues and activities.`,
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

    const parsed = JSON.parse(raw) as PlanResponse;
    if (!parsed.trip || !Array.isArray(parsed.itinerary)) {
      return new Response(
        JSON.stringify({ error: "Invalid response shape" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
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
