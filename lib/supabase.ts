import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Use for plan_cache and other server-side calls that don't need the user session. */
export function getSupabase() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

/** Use only in API routes that need to bypass RLS (e.g. share link access by token). Set SUPABASE_SERVICE_ROLE_KEY in env. */
export function getSupabaseServiceRole() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export type TripRow = {
  id: string;
  created_at: string;
  updated_at: string;
  payload: unknown;
  user_id?: string | null;
};
