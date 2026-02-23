import { NextResponse } from "next/server";

/** Deterministic placeholder when Unsplash is unavailable or returns nothing. */
function placeholderUrl(q: string): string {
  const seed = q.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${seed}/800/500`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "travel destination";

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return NextResponse.json({ url: placeholderUrl(q), alt: q });
  }

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${key}` } }
  );
  if (!res.ok) {
    return NextResponse.json({ url: placeholderUrl(q), alt: q });
  }
  const data = (await res.json()) as {
    results?: Array<{
      urls?: { regular?: string; small?: string };
      alt_description?: string | null;
    }>;
  };
  const first = data.results?.[0];
  if (!first?.urls?.regular) {
    return NextResponse.json({ url: placeholderUrl(q), alt: q });
  }
  return NextResponse.json({
    url: first.urls.regular,
    alt: first.alt_description ?? q,
  });
}
