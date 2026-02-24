import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to share trips" },
      { status: 401 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const role = body.role === "editor" ? "editor" : "viewer";

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const token = generateToken();
  const { data: link, error: linkError } = await supabase
    .from("share_links")
    .insert({
      trip_id: tripId,
      token,
      email: email || null,
      role,
    })
    .select("id, token, role")
    .single();

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const protocol = req.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : "");
  const url = baseUrl ? `${baseUrl}/share/${link.token}` : `/share/${link.token}`;

  return NextResponse.json({ url, token: link.token, role: link.role });
}
