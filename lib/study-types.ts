import type { ChessColor } from "@/lib/db/types";
import type { Grade } from "@/lib/srs/types";

/** One catalog move as the study board consumes it. */
export interface StudyMove {
  ply: number;
  san: string;
  explanation: string;
}

/** Everything the study UI needs to quiz one line. */
export interface StudyItem {
  sessionItemId: string;
  itemType: "new" | "review";
  attemptNumber: number;
  lineName: string;
  openingName: string;
  studentColor: ChessColor;
  /** Student moves in this block (the accumulated unlocked depth). */
  unlockedMoves: number;
  /** Plies 1..N required to play the block, both sides included. */
  moves: StudyMove[];
}

/** Per-move outcome reported by the study board. */
export interface StudyMoveResult {
  ply: number;
  expectedSan: string;
  playedSan: string;
  correct: boolean;
  elapsedMs: number;
}

export interface SubmitResult {
  grade: Grade;
  repeatInSession: boolean;
  /** Next scheduled review; null when the line repeats in this session. */
  nextDue: { date: string; inDays: number } | null;
  /** Present when the line was re-queued: the client appends it to its queue. */
  requeuedItem: StudyItem | null;
  sessionCompleted: boolean;
}
