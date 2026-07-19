"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/dates";
import type { ChessColor, Opening, OpeningLine } from "@/lib/db/types";
import { requireUser, type ServerSupabase } from "./auth-helpers";
import { completeSessionIfFinished } from "./session-helpers";

/**
 * Adds a catalog opening to the user's studies (without touching the rest
 * of the selection, unlike confirmOpenings). Re-adding a previously removed
 * opening with the same color keeps its SRS progress; with the other color
 * the progress resets, since the graded moves change entirely.
 */
export async function addOpening(
  openingId: string,
  color: ChessColor,
): Promise<void> {
  const { supabase, userId, profile } = await requireUser();

  const { data: opening, error: openingError } = await supabase
    .from("openings")
    .select("id, playable_colors")
    .eq("id", openingId)
    .single<Pick<Opening, "id" | "playable_colors">>();
  if (openingError || !opening) throw new Error("Opening not found");
  if (!opening.playable_colors.includes(color)) {
    throw new Error("This opening is not studied from that side");
  }

  // Detect a reactivation that flips the study color.
  const { data: previous } = await supabase
    .from("user_openings")
    .select("color")
    .eq("user_id", userId)
    .eq("opening_id", openingId)
    .maybeSingle<{ color: ChessColor }>();
  const colorChanged = previous !== null && previous.color !== color;

  const { error: upsertError } = await supabase.from("user_openings").upsert(
    {
      user_id: userId,
      opening_id: openingId,
      color,
      games_count: 0,
      is_active: true,
    },
    { onConflict: "user_id,opening_id" },
  );
  if (upsertError) throw new Error(upsertError.message);

  const { data: lines, error: linesError } = await supabase
    .from("opening_lines")
    .select("id, opening_id, name, rank")
    .eq("opening_id", openingId)
    .returns<OpeningLine[]>();
  if (linesError || !lines?.length) {
    throw new Error("No lines found for this opening");
  }

  // ignoreDuplicates keeps the SRS progress of previously created cards.
  const { error: cardsError } = await supabase.from("user_lines").upsert(
    lines.map((line) => ({
      user_id: userId,
      line_id: line.id,
      unlocked_moves: profile.moves_per_block,
    })),
    { onConflict: "user_id,line_id", ignoreDuplicates: true },
  );
  if (cardsError) throw new Error(cardsError.message);

  if (colorChanged) {
    const { error: resetError } = await supabase
      .from("user_lines")
      .update({
        state: "new",
        unlocked_moves: profile.moves_per_block,
        interval_days: 0,
        due_date: await getToday(profile.timezone),
        reps: 0,
        lapses: 0,
        last_result: null,
      })
      .eq("user_id", userId)
      .in(
        "line_id",
        lines.map((l) => l.id),
      );
    if (resetError) throw new Error(resetError.message);
  }

  revalidatePath("/", "layout");
}

/**
 * Removes an opening from the user's studies. Its user_lines stay in place
 * (deactivated openings are filtered out everywhere), so re-adding the
 * opening later restores the progress.
 */
export async function removeOpening(userOpeningId: string): Promise<void> {
  const { supabase, userId, profile } = await requireUser();

  const { data: userOpening, error } = await supabase
    .from("user_openings")
    .select("id, opening_id")
    .eq("id", userOpeningId)
    .eq("user_id", userId)
    .single<{ id: string; opening_id: string }>();
  if (error || !userOpening) throw new Error("Opening not found");

  const { error: deactivateError } = await supabase
    .from("user_openings")
    .update({ is_active: false })
    .eq("id", userOpening.id);
  if (deactivateError) throw new Error(deactivateError.message);

  await dropPendingItemsForOpening(supabase, userId, userOpening.opening_id, profile.timezone);

  revalidatePath("/", "layout");
}

/**
 * Today's session may hold ungraded items of the removed opening. The study
 * page hides them (their opening is inactive) but the completion check still
 * counts them, leaving the session impossible to finish — so drop them and
 * re-run that check.
 */
async function dropPendingItemsForOpening(
  supabase: ServerSupabase,
  userId: string,
  openingId: string,
  timezone: string,
): Promise<void> {
  const today = await getToday(timezone);
  const { data: session } = await supabase
    .from("study_sessions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("session_date", today)
    .maybeSingle<{ id: string; status: "in_progress" | "completed" }>();
  if (!session || session.status !== "in_progress") return;

  const { data: lines } = await supabase
    .from("opening_lines")
    .select("id")
    .eq("opening_id", openingId)
    .returns<{ id: string }[]>();
  const { data: userLines } = await supabase
    .from("user_lines")
    .select("id")
    .eq("user_id", userId)
    .in("line_id", (lines ?? []).map((l) => l.id))
    .returns<{ id: string }[]>();
  if (!userLines?.length) return;

  const { error: deleteError } = await supabase
    .from("session_items")
    .delete()
    .eq("session_id", session.id)
    .is("result", null)
    .in("user_line_id", userLines.map((ul) => ul.id));
  if (deleteError) throw new Error(deleteError.message);

  await completeSessionIfFinished(supabase, session.id);
}
