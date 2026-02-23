import type { PlanResponse } from "@/lib/types";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const plan = body.plan as PlanResponse | null | undefined;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = new OpenAI({ apiKey });
    const planJson = plan ? JSON.stringify(plan) : "No trip loaded yet.";

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      text: { format: { type: "json_object" } },
      input: [
        {
          role: "system",
          content: `You are a travel copilot. The user has a trip itinerary (or none). They send a short message (e.g. "Make it cheaper", "Add 2 museums", "Wheelchair-accessible only").
Respond with a JSON object:
- "reply": a short, friendly reply (1-3 sentences) acknowledging their request and what you suggest.
- "plan": (optional) if you can output a revised full itinerary that applies their request, include it in the exact same structure as the input trip: { "trip": {...}, "itinerary": [ { "day", "base_location", "blocks": [ { "id", "time", "title", "type", "notes" } ] } ] }. Keep all block ids unique (d{day}-{m|a|e}-{index}). If you cannot or the request is vague, omit "plan".
Return ONLY valid JSON, no markdown.`,
        },
        {
          role: "user",
          content: `Current trip:\n${planJson}\n\nUser request: ${message}`,
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

    const data = JSON.parse(raw) as { reply?: string; plan?: PlanResponse };
    const reply = typeof data.reply === "string" ? data.reply : "Done. Check your itinerary for updates.";
    const planUpdate = data.plan && typeof data.plan === "object" && data.plan.trip && Array.isArray(data.plan.itinerary)
      ? data.plan
      : undefined;

    return new Response(JSON.stringify({ reply, plan: planUpdate }), {
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
