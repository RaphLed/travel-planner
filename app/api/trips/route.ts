import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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
    return NextResponse.json([]);
  }
  const { data, error } = await supabase
    .from("trips")
    .select("id, created_at, updated_at, payload")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
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
      { error: "Sign in to save trips" },
      { status: 401 }
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
    .insert({
      user_id: user.id,
      payload,
      updated_at: new Date().toISOString(),
    })
    .select("id, created_at, updated_at, payload")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
