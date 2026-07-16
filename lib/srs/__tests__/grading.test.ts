import { describe, expect, it } from "vitest";
import { gradeBlock, SLOW_THRESHOLD_MS } from "../grading";
import type { MoveResult } from "../types";

const fast = (correct = true): MoveResult => ({ correct, elapsedMs: 5_000 });
const slow = (): MoveResult => ({ correct: true, elapsedMs: SLOW_THRESHOLD_MS + 1 });

describe("gradeBlock — first block", () => {
  it("is good when every move is correct and fast", () => {
    expect(gradeBlock([fast(), fast(), fast(), fast()], true)).toBe("good");
  });

  it("is mid when correct but any move was slow", () => {
    expect(gradeBlock([fast(), slow(), fast(), fast()], true)).toBe("mid");
  });

  it("is bad on any error", () => {
    expect(gradeBlock([fast(), fast(false), fast(), fast()], true)).toBe("bad");
  });

  it("a slow *incorrect* move counts as an error, not as slow", () => {
    expect(
      gradeBlock([{ correct: false, elapsedMs: SLOW_THRESHOLD_MS + 1 }], true),
    ).toBe("bad");
  });
});

describe("gradeBlock — accumulated block", () => {
  const eight = (errors: number, slows = 0): MoveResult[] => [
    ...Array.from({ length: errors }, () => fast(false)),
    ...Array.from({ length: slows }, () => slow()),
    ...Array.from({ length: 8 - errors - slows }, () => fast()),
  ];

  it("is good with 0 errors and all fast", () => {
    expect(gradeBlock(eight(0), false)).toBe("good");
  });

  it("is mid with exactly 1 error", () => {
    expect(gradeBlock(eight(1), false)).toBe("mid");
  });

  it("is mid with 0 errors but a slow move", () => {
    expect(gradeBlock(eight(0, 1), false)).toBe("mid");
  });

  it("is bad with more than 1 error", () => {
    expect(gradeBlock(eight(2), false)).toBe("bad");
  });
});
