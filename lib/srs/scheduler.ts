import type { CardState, Grade } from "./types";

/** Anki-style ease factor applied on each successful review. */
export const EASE = 2.5;
/** Interval (days) when a new card graduates with "good". */
export const GRADUATING_INTERVAL_DAYS = 1;
/** Interval (days) for the first successful review after graduating. */
export const FIRST_REVIEW_INTERVAL_DAYS = 3;

export interface ScheduleResult {
  card: CardState;
  /** True when the line must be re-queued inside the current session. */
  repeatInSession: boolean;
}

/** Adds n days to a yyyy-mm-dd date string (UTC, no timezone drift). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Applies a block grade to a card, following the spec (section 6) with Anki
 * defaults where the spec is silent:
 *
 * New card:  bad/mid -> repeat this session; good -> graduate, due tomorrow.
 * Review:    bad -> lapse: back to learning and repeat this session (the
 *            interval restarts from scratch when it graduates again);
 *            mid -> due tomorrow, interval does not grow;
 *            good -> interval 1d -> 3d, then x2.5 with no upper cap.
 *
 * Depth: a clean "good" on a line that still has locked moves unlocks the
 * next block for its next appearance.
 */
export function applyGrade(
  card: CardState,
  grade: Grade,
  today: string,
  opts: { totalMoves: number; movesPerBlock: number },
): ScheduleResult {
  const next: CardState = { ...card };

  if (card.state === "new") {
    if (grade !== "good") {
      return { card: next, repeatInSession: true };
    }
    next.state = "review";
    next.intervalDays = GRADUATING_INTERVAL_DAYS;
    next.dueDate = addDays(today, GRADUATING_INTERVAL_DAYS);
    next.reps = card.reps + 1;
    unlockNextBlock(next, opts);
    return { card: next, repeatInSession: false };
  }

  // state === "review"
  if (grade === "bad") {
    next.state = "new";
    next.lapses = card.lapses + 1;
    next.intervalDays = 0;
    return { card: next, repeatInSession: true };
  }

  next.reps = card.reps + 1;
  if (grade === "mid") {
    next.dueDate = addDays(today, 1);
    return { card: next, repeatInSession: false };
  }

  // good
  next.intervalDays =
    card.intervalDays <= GRADUATING_INTERVAL_DAYS
      ? FIRST_REVIEW_INTERVAL_DAYS
      : card.intervalDays * EASE;
  next.dueDate = addDays(today, Math.round(next.intervalDays));
  unlockNextBlock(next, opts);
  return { card: next, repeatInSession: false };
}

function unlockNextBlock(
  card: CardState,
  opts: { totalMoves: number; movesPerBlock: number },
): void {
  if (card.unlockedMoves < opts.totalMoves) {
    card.unlockedMoves = Math.min(
      card.unlockedMoves + opts.movesPerBlock,
      opts.totalMoves,
    );
  }
}
