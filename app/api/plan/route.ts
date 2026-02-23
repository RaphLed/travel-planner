import { getSupabase } from "@/lib/supabase";
import { createHash } from "crypto";
import OpenAI from "openai";

function inputHash(vibes: string, days: number): string {
  return createHash("sha256").update(`${vibes}|${days}`).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const vibes = typeof body.vibes === "string" ? body.vibes : "sun, nature, solitude";
    const days = typeof body.days === "number" ? body.days : 5;
    const hash = inputHash(vibes, days);

    // Return cached plan if available (reduces API calls)
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
          content: `Create a ${days}-day trip idea based on these vibes: ${vibes}.

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
- You MUST include exactly ${days} day objects in "itinerary".
- Each "blocks" item MUST have a unique id. Use the format: d{day}-{m|a|e}-{index}, e.g. d3-a-2.
- Each day should have 2–4 blocks per time period (morning/afternoon/evening) unless the vibe implies slower pace.
- "base_location" should be a realistic place (city/town/region).
- "notes" should be short and practical (1–2 sentences).`,
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

    // Store in cache for future identical requests
    if (supabase) {
      await supabase.from("plan_cache").upsert(
        {
          input_hash: hash,
          vibes,
          days,
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