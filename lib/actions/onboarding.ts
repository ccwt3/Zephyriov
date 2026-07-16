"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchLichessGames } from "@/lib/external/lichess";
import { fetchChesscomGames } from "@/lib/external/chesscom";
import {
  suggestOpenings,
  type CatalogOpening,
  type OpeningSuggestion,
} from "@/lib/external/opening-matcher";
import type { AnalyzedGame } from "@/lib/external/types";
import type {
  AnalysisTimeControl,
  ChessColor,
  OpeningLine,
} from "@/lib/db/types";
import { requireUser } from "./auth-helpers";

const TIME_CONTROLS: AnalysisTimeControl[] = ["bullet", "blitz", "rapid", "slow"];

export interface AnalyzeResult {
  suggestions: OpeningSuggestion[];
  gamesAnalyzed: number;
  sourceErrors: string[];
}

/**
 * Fetches recent games from both platforms, matches them against the
 * catalog and returns the user's top 3 white + top 3 black openings.
 * Nothing is persisted until confirmOpenings.
 */
export async function analyzeOpenings(
  lichessUsername: string,
  chesscomUsername: string,
  timeControls: AnalysisTimeControl[],
): Promise<AnalyzeResult> {
  const { supabase, userId } = await requireUser();

  const lichess = lichessUsername.trim();
  const chesscom = chesscomUsername.trim();
  if (!lichess && !chesscom) {
    throw new Error("Provide at least one username");
  }
  const controls = TIME_CONTROLS.filter((tc) => timeControls.includes(tc));
  if (controls.length === 0) {
    throw new Error("Select at least one time control");
  }

  // Persist usernames and time controls so re-analysis is one click later.
  await supabase
    .from("profiles")
    .update({
      lichess_username: lichess || null,
      chesscom_username: chesscom || null,
      analysis_time_controls: controls,
    })
    .eq("user_id", userId);

  const results = await Promise.allSettled([
    lichess ? fetchLichessGames(lichess, controls) : Promise.resolve([]),
    chesscom ? fetchChesscomGames(chesscom, controls) : Promise.resolve([]),
  ]);

  const games: AnalyzedGame[] = [];
  const sourceErrors: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      games.push(...result.value);
    } else {
      sourceErrors.push(String(result.reason?.message ?? result.reason));
    }
  }
  if (games.length === 0 && sourceErrors.length > 0) {
    throw new Error(`Could not fetch games: ${sourceErrors.join("; ")}`);
  }

  const { data: catalog, error } = await supabase
    .from("openings")
    .select("id, slug, name, playable_colors, detection_keys")
    .returns<CatalogOpening[]>();
  if (error || !catalog?.length) {
    throw new Error("Opening catalog is empty — run supabase/seed.sql first");
  }

  return {
    suggestions: suggestOpenings(games, catalog),
    gamesAnalyzed: games.length,
    sourceErrors,
  };
}

export interface OpeningSelection {
  openingId: string;
  color: ChessColor;
  gamesCount: number;
}

/**
 * Persists the chosen openings and creates the SRS cards (user_lines) for
 * every line of each opening. Re-running replaces the previous selection;
 * cards of openings that stay selected keep their progress.
 *
 * Redirects to Home on success — the navigation happens server-side, after
 * onboarded_at is written, so the client can't land on Home before the flag
 * exists (which would bounce it straight back to /onboarding).
 */
export async function confirmOpenings(
  selections: OpeningSelection[],
): Promise<never> {
  const { supabase, userId, profile } = await requireUser();
  if (selections.length === 0) {
    throw new Error("Select at least one opening");
  }

  const selectedIds = selections.map((s) => s.openingId);

  // Deactivate everything, then upsert the new selection.
  const { error: deactivateError } = await supabase
    .from("user_openings")
    .update({ is_active: false })
    .eq("user_id", userId);
  if (deactivateError) throw new Error(deactivateError.message);

  const { error: upsertError } = await supabase.from("user_openings").upsert(
    selections.map((s) => ({
      user_id: userId,
      opening_id: s.openingId,
      color: s.color,
      games_count: s.gamesCount,
      is_active: true,
    })),
    { onConflict: "user_id,opening_id" },
  );
  if (upsertError) throw new Error(upsertError.message);

  // Create missing SRS cards for every line of the selected openings.
  const { data: lines, error: linesError } = await supabase
    .from("opening_lines")
    .select("id, opening_id, name, rank")
    .in("opening_id", selectedIds)
    .returns<OpeningLine[]>();
  if (linesError || !lines?.length) {
    throw new Error("No lines found for the selected openings");
  }

  const { error: cardsError } = await supabase.from("user_lines").upsert(
    lines.map((line) => ({
      user_id: userId,
      line_id: line.id,
      unlocked_moves: profile.moves_per_block,
    })),
    { onConflict: "user_id,line_id", ignoreDuplicates: true },
  );
  if (cardsError) throw new Error(cardsError.message);

  const { error: onboardedError } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (onboardedError) throw new Error(onboardedError.message);

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Changes the color a user practices an opening from. Resets the SRS state
 * of that opening's lines, since the graded moves change entirely.
 */
export async function changeOpeningColor(
  userOpeningId: string,
  color: ChessColor,
): Promise<void> {
  const { supabase, userId, profile } = await requireUser();

  const { data: userOpening, error } = await supabase
    .from("user_openings")
    .select("id, opening_id")
    .eq("id", userOpeningId)
    .eq("user_id", userId)
    .single<{ id: string; opening_id: string }>();
  if (error || !userOpening) throw new Error("Opening not found");

  await supabase
    .from("user_openings")
    .update({ color })
    .eq("id", userOpening.id);

  const { data: lines } = await supabase
    .from("opening_lines")
    .select("id")
    .eq("opening_id", userOpening.opening_id)
    .returns<{ id: string }[]>();

  if (lines?.length) {
    await supabase
      .from("user_lines")
      .update({
        state: "new",
        unlocked_moves: profile.moves_per_block,
        interval_days: 0,
        due_date: new Date().toISOString().slice(0, 10),
        reps: 0,
        lapses: 0,
        last_result: null,
      })
      .eq("user_id", userId)
      .in(
        "line_id",
        lines.map((l) => l.id),
      );
  }

  revalidatePath("/", "layout");
}
