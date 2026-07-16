import type { LineState } from "./types";

export interface CandidateLine {
  userLineId: string;
  openingId: string;
  state: LineState;
  /** ISO date string (yyyy-mm-dd). */
  dueDate: string;
}

export interface SessionPlan {
  /** New lines first, then due reviews (spec section 6.3). */
  items: { userLineId: string; itemType: "new" | "review" }[];
}

/**
 * Builds the daily session: every review line that is due today plus up to
 * `newLinesTarget` new lines, picked round-robin across openings so the mix
 * covers as many openings as possible.
 */
export function buildSession(opts: {
  candidates: CandidateLine[];
  today: string;
  newLinesTarget: number;
  rng?: () => number;
}): SessionPlan {
  const { candidates, today, newLinesTarget, rng = Math.random } = opts;

  const due = candidates.filter((c) => c.dueDate <= today);
  const reviews = due.filter((c) => c.state === "review");
  const newPool = due.filter((c) => c.state === "new");

  // Group new lines by opening and shuffle within each group.
  const byOpening = new Map<string, CandidateLine[]>();
  for (const line of newPool) {
    const group = byOpening.get(line.openingId) ?? [];
    group.push(line);
    byOpening.set(line.openingId, group);
  }
  const groups = shuffle([...byOpening.values()].map((g) => shuffle(g, rng)), rng);

  // Round-robin: one line per opening before repeating an opening.
  const picked: CandidateLine[] = [];
  for (let round = 0; picked.length < newLinesTarget; round++) {
    const before = picked.length;
    for (const group of groups) {
      if (picked.length >= newLinesTarget) break;
      if (group[round]) picked.push(group[round]);
    }
    if (picked.length === before) break; // pool exhausted
  }

  return {
    items: [
      ...picked.map((c) => ({ userLineId: c.userLineId, itemType: "new" as const })),
      ...reviews.map((c) => ({ userLineId: c.userLineId, itemType: "review" as const })),
    ],
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
