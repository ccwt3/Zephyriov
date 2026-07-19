import { fetchAllRows } from "@/lib/supabase/paginate";
import type { ServerSupabase } from "@/lib/actions/auth-helpers";
import type { ChessColor } from "@/lib/db/types";

/** Highest ply of each line, paged so catalog growth never truncates it. */
export async function fetchMaxPlyByLine(
  supabase: ServerSupabase,
  lineIds: string[],
): Promise<Map<string, number>> {
  if (lineIds.length === 0) return new Map();

  const rows = await fetchAllRows<{ line_id: string; ply: number }>((from, to) =>
    supabase
      .from("line_moves")
      .select("line_id, ply")
      .in("line_id", lineIds)
      .order("id")
      .range(from, to),
  );

  const maxPly = new Map<string, number>();
  for (const row of rows) {
    if (row.ply > (maxPly.get(row.line_id) ?? 0)) {
      maxPly.set(row.line_id, row.ply);
    }
  }
  return maxPly;
}

/** Student moves contained in a line of `maxPly` plies (odd plies are White's). */
export function studentMoveCount(maxPly: number, color: ChessColor): number {
  return color === "white" ? Math.ceil(maxPly / 2) : Math.floor(maxPly / 2);
}
