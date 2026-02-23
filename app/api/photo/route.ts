import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Unsplash not configured" },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "travel destination";
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: "Photo search failed" },
      { status: 502 }
    );
  }
  const data = (await res.json()) as {
    results?: Array<{
      urls?: { regular?: string; small?: string };
      alt_description?: string | null;
    }>;
  };
  const first = data.results?.[0];
  if (!first?.urls?.regular) {
    return NextResponse.json(
      { error: "No image found" },
      { status: 404 }
    );
  }
  return NextResponse.json({
    url: first.urls.regular,
    alt: first.alt_description ?? q,
  });
}
