import { getSupabaseServiceRole } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json(
      { error: "Share not configured" },
      { status: 503 }
    );
  }
  const { data: link, error: linkError } = await supabase
    .from("share_links")
    .select("trip_id, role")
    .eq("token", token)
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, created_at, updated_at, payload")
    .eq("id", link.trip_id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...trip,
    shareRole: link.role,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json(
      { error: "Share not configured" },
      { status: 503 }
    );
  }
  const { data: link, error: linkError } = await supabase
    .from("share_links")
    .select("trip_id, role")
    .eq("token", token)
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
  }
  if (link.role !== "editor") {
    return NextResponse.json(
      { error: "This link does not allow editing" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const payload = body.payload ?? body;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { error: "Missing or invalid payload" },
      { status: 400 }
    );
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .update({
      payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", link.trip_id)
    .select("id, created_at, updated_at, payload")
    .single();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 });
  }
  return NextResponse.json(trip);
}
