export type Grade = "bad" | "mid" | "good";
export type LineState = "new" | "review";

/** Outcome of a single graded move inside a block. */
export interface MoveResult {
  correct: boolean;
  elapsedMs: number;
}

/** SRS state of one line card (mirrors the user_lines row). */
export interface CardState {
  state: LineState;
  intervalDays: number;
  /** ISO date string (yyyy-mm-dd). */
  dueDate: string;
  /** Student moves unlocked so far. */
  unlockedMoves: number;
  reps: number;
  lapses: number;
}
