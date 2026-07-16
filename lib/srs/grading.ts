import type { Grade, MoveResult } from "./types";

/** A correct move slower than this is "slow" and caps the grade at mid. */
export const SLOW_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Grades a completed block of moves.
 *
 * First block (line at its initial depth):
 *   any error -> bad; all correct but any slow move -> mid; else good.
 *
 * Accumulated block (depth already extended past the first block):
 *   more than 1 error -> bad; exactly 1 error or any slow move -> mid;
 *   0 errors and all fast -> good.
 */
export function gradeBlock(
  results: MoveResult[],
  isFirstBlock: boolean,
): Grade {
  const errors = results.filter((r) => !r.correct).length;
  const anySlow = results.some(
    (r) => r.correct && r.elapsedMs > SLOW_THRESHOLD_MS,
  );

  if (isFirstBlock) {
    if (errors > 0) return "bad";
    return anySlow ? "mid" : "good";
  }

  if (errors > 1) return "bad";
  if (errors === 1 || anySlow) return "mid";
  return "good";
}
