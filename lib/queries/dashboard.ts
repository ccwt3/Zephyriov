import { requireUser } from "@/lib/actions/auth-helpers";
import { getToday } from "@/lib/dates";
import type { ChessColor, Profile } from "@/lib/db/types";
import type { Grade, LineState } from "@/lib/srs/types";

export interface LineProgress {
  lineName: string;
  rank: number;
  state: LineState;
  unlockedMoves: number;
  totalMoves: number;
  dueDate: string;
  lastResult: Grade | null;
  reps: number;
}

export interface OpeningProgress {
  userOpeningId: string;
  openingId: string;
  name: string;
  eco: string;
  color: ChessColor;
  playableColors: ChessColor[];
  gamesCount: number;
  /** 0..1 — mastered share across the opening's lines. */
  progress: number;
  lines: LineProgress[];
}

export interface DashboardData {
  profile: Profile;
  today: string;
  streak: { current: number; best: number };
  todayStatus: "not_started" | "in_progress" | "completed";
  dueCount: number;
  openings: OpeningProgress[];
}

/** Loads everything Home / Progress need in one place. */
export async function getDashboardData(): Promise<DashboardData> {
  const { supabase, userId, profile } = await requireUser();
  const today = await getToday(profile.timezone);

  const [{ data: streak }, { data: session }, { data: userOpenings }, { data: userLines }] =
    await Promise.all([
      supabase
        .from("user_streaks")
        .select("current_streak, best_streak")
        .eq("user_id", userId)
        .maybeSingle<{ current_streak: number; best_streak: number }>(),
      supabase
        .from("study_sessions")
        .select("status")
        .eq("user_id", userId)
        .eq("session_date", today)
        .maybeSingle<{ status: "in_progress" | "completed" }>(),
      supabase
        .from("user_openings")
        .select("id, opening_id, color, games_count, openings(name, eco, playable_colors)")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase
        .from("user_lines")
        .select(
          "line_id, state, unlocked_moves, due_date, last_result, reps, opening_lines(opening_id, name, rank)",
        )
        .eq("user_id", userId),
    ]);

  // Total student moves per line, derived from the catalog.
  const lineIds = (userLines ?? []).map((l) => l.line_id as string);
  const { data: plies } = lineIds.length
    ? await supabase.from("line_moves").select("line_id, ply").in("line_id", lineIds)
    : { data: [] };
  const maxPly = new Map<string, number>();
  for (const row of plies ?? []) {
    if (row.ply > (maxPly.get(row.line_id) ?? 0)) maxPly.set(row.line_id, row.ply);
  }

  const colorByOpening = new Map(
    (userOpenings ?? []).map((uo) => [uo.opening_id as string, uo.color as ChessColor]),
  );

  let dueCount = 0;
  const linesByOpening = new Map<string, LineProgress[]>();
  for (const ul of userLines ?? []) {
    const line = ul.opening_lines as unknown as {
      opening_id: string;
      name: string;
      rank: number;
    } | null;
    if (!line) continue;
    const color = colorByOpening.get(line.opening_id);
    if (!color) continue;

    const ply = maxPly.get(ul.line_id as string) ?? 0;
    const totalMoves = color === "white" ? Math.ceil(ply / 2) : Math.floor(ply / 2);
    if ((ul.due_date as string) <= today) dueCount++;

    const list = linesByOpening.get(line.opening_id) ?? [];
    list.push({
      lineName: line.name,
      rank: line.rank as number,
      state: ul.state as LineState,
      unlockedMoves: Math.min(ul.unlocked_moves as number, totalMoves),
      totalMoves,
      dueDate: ul.due_date as string,
      lastResult: ul.last_result as Grade | null,
      reps: ul.reps as number,
    });
    linesByOpening.set(line.opening_id, list);
  }

  const openings: OpeningProgress[] = (userOpenings ?? []).map((uo) => {
    const opening = uo.openings as unknown as {
      name: string;
      eco: string;
      playable_colors: ChessColor[];
    };
    const lines = (linesByOpening.get(uo.opening_id as string) ?? []).sort(
      (a, b) => a.rank - b.rank,
    );
    const progress =
      lines.length === 0
        ? 0
        : lines.reduce(
            (sum, l) =>
              sum + (l.reps > 0 ? l.unlockedMoves / Math.max(l.totalMoves, 1) : 0),
            0,
          ) / lines.length;

    return {
      userOpeningId: uo.id as string,
      openingId: uo.opening_id as string,
      name: opening?.name ?? "",
      eco: opening?.eco ?? "",
      color: uo.color as ChessColor,
      playableColors: opening?.playable_colors ?? [],
      gamesCount: uo.games_count as number,
      progress,
      lines,
    };
  });

  return {
    profile,
    today,
    streak: {
      current: streak?.current_streak ?? 0,
      best: streak?.best_streak ?? 0,
    },
    todayStatus: session ? session.status : "not_started",
    dueCount,
    openings,
  };
}
