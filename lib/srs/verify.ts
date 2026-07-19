import type { MoveResult } from "./types";

/** What the client reports for one student move (untrusted input). */
export interface ReportedMove {
  ply: number;
  playedSan: string;
  elapsedMs: number;
}

/** A catalog move the student was expected to play. */
export interface ExpectedMove {
  ply: number;
  san: string;
}

/** A reported move after server-side verification. */
export interface VerifiedMove extends MoveResult {
  ply: number;
  expectedSan: string;
  playedSan: string;
}

/** SAN never exceeds a few characters ("exd8=Q#"); anything longer is garbage. */
const MAX_SAN_LENGTH = 12;

/**
 * Recomputes each reported move against the catalog block. `correct` is
 * derived here, never taken from the client, and the report must cover
 * exactly the expected plies — no missing, extra or duplicate moves.
 * Throws on any mismatch so a forged report can't reach the grader.
 */
export function verifyBlockResults(
  reported: ReportedMove[],
  expected: ExpectedMove[],
): VerifiedMove[] {
  const sanByPly = new Map(expected.map((m) => [m.ply, m.san]));
  if (reported.length !== sanByPly.size) {
    throw new Error("Move report does not match the block");
  }

  const verified: VerifiedMove[] = [];
  for (const move of reported) {
    const expectedSan = sanByPly.get(move.ply);
    if (expectedSan === undefined) {
      throw new Error("Move report does not match the block");
    }
    sanByPly.delete(move.ply); // consume it: a duplicate ply fails the lookup

    if (
      typeof move.playedSan !== "string" ||
      move.playedSan.length === 0 ||
      move.playedSan.length > MAX_SAN_LENGTH ||
      !Number.isFinite(move.elapsedMs) ||
      move.elapsedMs < 0
    ) {
      throw new Error("Invalid move report");
    }

    verified.push({
      ply: move.ply,
      expectedSan,
      playedSan: move.playedSan,
      correct: move.playedSan === expectedSan,
      elapsedMs: Math.round(move.elapsedMs),
    });
  }
  return verified;
}
