import type { LineMove } from "@/lib/db/types";

/**
 * Formats catalog moves as standard notation: "1.e4 e5 2.Nf3 Nc6".
 * Plies are 1-based (odd = White), so the move number only depends on
 * each ply's parity — a line starting on a Black ply still formats right.
 */
export function formatLineNotation(
  moves: Pick<LineMove, "ply" | "san">[],
): string {
  return [...moves]
    .sort((a, b) => a.ply - b.ply)
    .map((m) => (m.ply % 2 === 1 ? `${(m.ply + 1) / 2}.${m.san}` : m.san))
    .join(" ");
}
