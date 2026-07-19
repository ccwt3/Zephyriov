import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/db/types";

/** Returns the Supabase client, the authenticated user id and their profile.
 *  Throws when unauthenticated — server actions rely on the proxy redirect,
 *  this is the defensive backstop. */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single<Profile>();
  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  return { supabase, userId, profile };
}

/** The RLS-scoped Supabase client that requireUser resolves. */
export type ServerSupabase = Awaited<ReturnType<typeof requireUser>>["supabase"];
