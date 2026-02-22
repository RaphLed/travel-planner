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

    const client = new OpenAI({ apiKey });

    const body = await req.json().catch(() => ({}));
    const vibes = typeof body.vibes === "string" ? body.vibes : "sun, nature, solitude";
    const days = typeof body.days === "number" ? body.days : 5;

    const r = await client.responses.create({
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

Return JSON with this exact structure:
{
  "title": "string",
  "summary": "string",
  "days": [
    { "day": 1, "morning": ["string"], "afternoon": ["string"], "evening": ["string"] }
  ]
}`,
        },
      ],
    });

    const text = r.output_text ?? "";
    const json = JSON.parse(text);

    return new Response(JSON.stringify(json), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}