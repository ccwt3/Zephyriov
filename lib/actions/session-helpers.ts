import type { ServerSupabase } from "./auth-helpers";

// No "use server" here on purpose: that directive would expose every export
// as a client-callable action. These are internal helpers shared by actions.

/**
 * Marks the session completed once no ungraded items remain. Shared by
 * submitLineResult (grading the last item) and removeOpening (deleting the
 * pending items of a removed opening).
 */
export async function completeSessionIfFinished(
  supabase: ServerSupabase,
  sessionId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("session_items")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .is("result", null);

  if ((count ?? 0) > 0) return false;
  await supabase
    .from("study_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "in_progress");
  return true;
}
