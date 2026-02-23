import { getSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }
  const { data, error } = await supabase
    .from("trips")
    .select("id, created_at, updated_at, payload")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
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
  const { data, error } = await supabase
    .from("trips")
    .update({
      payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, created_at, updated_at, payload")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
