import { describe, expect, it } from "vitest";
import { addDays, applyGrade } from "../scheduler";
import type { CardState } from "../types";

const TODAY = "2026-07-14";
const OPTS = { totalMoves: 10, movesPerBlock: 4 };

const newCard = (over: Partial<CardState> = {}): CardState => ({
  state: "new",
  intervalDays: 0,
  dueDate: TODAY,
  unlockedMoves: 4,
  reps: 0,
  lapses: 0,
  ...over,
});

const reviewCard = (over: Partial<CardState> = {}): CardState => ({
  state: "review",
  intervalDays: 1,
  dueDate: TODAY,
  unlockedMoves: 4,
  reps: 1,
  lapses: 0,
  ...over,
});

describe("addDays", () => {
  it("adds days without timezone drift", () => {
    expect(addDays("2026-07-14", 1)).toBe("2026-07-15");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-07-14", 47)).toBe("2026-08-30");
  });
});

describe("applyGrade — new cards (spec 6.1)", () => {
  it("bad repeats in the same session without state change", () => {
    const { card, repeatInSession } = applyGrade(newCard(), "bad", TODAY, OPTS);
    expect(repeatInSession).toBe(true);
    expect(card.state).toBe("new");
  });

  it("mid repeats in the same session", () => {
    const { repeatInSession } = applyGrade(newCard(), "mid", TODAY, OPTS);
    expect(repeatInSession).toBe(true);
  });

  it("good graduates: review state, due tomorrow, interval 1", () => {
    const { card, repeatInSession } = applyGrade(newCard(), "good", TODAY, OPTS);
    expect(repeatInSession).toBe(false);
    expect(card.state).toBe("review");
    expect(card.intervalDays).toBe(1);
    expect(card.dueDate).toBe("2026-07-15");
    expect(card.reps).toBe(1);
  });
});

describe("applyGrade — review cards (spec 6.2)", () => {
  it("bad lapses: repeats in session and goes back to learning", () => {
    const { card, repeatInSession } = applyGrade(
      reviewCard({ intervalDays: 7.5 }),
      "bad",
      TODAY,
      OPTS,
    );
    expect(repeatInSession).toBe(true);
    expect(card.state).toBe("new");
    expect(card.lapses).toBe(1);
    expect(card.intervalDays).toBe(0);
  });

  it("a lapsed card that passes again restarts at 1 day", () => {
    const lapsed = applyGrade(reviewCard({ intervalDays: 19 }), "bad", TODAY, OPTS).card;
    const { card } = applyGrade(lapsed, "good", TODAY, OPTS);
    expect(card.state).toBe("review");
    expect(card.intervalDays).toBe(1);
    expect(card.dueDate).toBe("2026-07-15");
  });

  it("mid comes back tomorrow without growing the interval", () => {
    const { card, repeatInSession } = applyGrade(
      reviewCard({ intervalDays: 7.5 }),
      "mid",
      TODAY,
      OPTS,
    );
    expect(repeatInSession).toBe(false);
    expect(card.intervalDays).toBe(7.5);
    expect(card.dueDate).toBe("2026-07-15");
  });

  it("good grows 1 -> 3 -> 7.5 -> 18.75 -> ~47 with no cap", () => {
    let card = reviewCard({ intervalDays: 1, unlockedMoves: 10 });
    const seen: number[] = [];
    for (let i = 0; i < 4; i++) {
      card = applyGrade(card, "good", TODAY, OPTS).card;
      seen.push(card.intervalDays);
    }
    expect(seen).toEqual([3, 7.5, 18.75, 46.875]);
    expect(card.dueDate).toBe(addDays(TODAY, 47));
  });
});

describe("applyGrade — depth progression (spec 7)", () => {
  it("good unlocks the next block", () => {
    const { card } = applyGrade(newCard({ unlockedMoves: 4 }), "good", TODAY, OPTS);
    expect(card.unlockedMoves).toBe(8);
  });

  it("unlock caps at the line's total moves", () => {
    const { card } = applyGrade(
      reviewCard({ unlockedMoves: 8, intervalDays: 3 }),
      "good",
      TODAY,
      OPTS,
    );
    expect(card.unlockedMoves).toBe(10);
  });

  it("a fully unlocked line stays at max depth", () => {
    const { card } = applyGrade(
      reviewCard({ unlockedMoves: 10, intervalDays: 3 }),
      "good",
      TODAY,
      OPTS,
    );
    expect(card.unlockedMoves).toBe(10);
  });

  it("mid and bad do not unlock depth", () => {
    expect(applyGrade(reviewCard(), "mid", TODAY, OPTS).card.unlockedMoves).toBe(4);
    expect(applyGrade(reviewCard(), "bad", TODAY, OPTS).card.unlockedMoves).toBe(4);
  });
});
