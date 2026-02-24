import type { Block } from "@/lib/types";
import OpenAI from "openai";

export type BlockAlternative = {
  title: string;
  notes?: string;
  /** e.g. "4.6 (Google)" */
  rating?: string;
  type: Block["type"];
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const location =
      typeof body.location === "string" && body.location.trim()
        ? body.location.trim()
        : null;
    const type =
      typeof body.type === "string" && body.type.trim()
        ? (body.type as Block["type"])
        : "culture";
    const currentTitle =
      typeof body.currentTitle === "string" ? body.currentTitle.trim() : undefined;

    if (!location) {
      return new Response(
        JSON.stringify({ error: "Missing location" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validTypes: Block["type"][] = [
      "food",
      "nature",
      "culture",
      "nightlife",
      "relax",
      "logistics",
    ];
    const activityType = validTypes.includes(type) ? type : "culture";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = new OpenAI({ apiKey });
    const typeLabel =
      activityType === "culture"
        ? "museums, galleries, historic sites"
        : activityType === "food"
          ? "restaurants, cafés, food experiences"
          : activityType === "nature"
            ? "parks, nature spots, outdoor activities"
            : activityType === "nightlife"
              ? "bars, clubs, evening venues"
              : activityType === "relax"
                ? "spas, beaches, wellness"
                : "practical venues (e.g. markets, transport hubs)";

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      text: { format: { type: "json_object" } },
      input: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON. No markdown. No code fences. List real, well-known venues/places that exist in the given city. Include plausible ratings (e.g. 4.5/5 or 4.6 Google) when possible.",
        },
        {
          role: "user",
          content: `City/region: ${location}. Activity type: ${activityType} (${typeLabel}).${currentTitle ? ` Current suggestion: ${currentTitle}. Include 6–8 alternative options (real places with real names).` : " List 6–8 top options."}

Return JSON:
{
  "alternatives": [
    { "title": "Exact place name", "notes": "Brief one-line description optional", "rating": "4.5 (Google)" or null, "type": "${activityType}" }
  ]
}
Only include "type" as "${activityType}".`,
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
    const alternatives = Array.isArray(parsed.alternatives)
      ? (parsed.alternatives as BlockAlternative[]).slice(0, 8)
      : [];

    return new Response(JSON.stringify({ alternatives }), {
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
