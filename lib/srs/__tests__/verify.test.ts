import { describe, expect, it } from "vitest";
import { verifyBlockResults } from "../verify";

const expected = [
  { ply: 1, san: "e4" },
  { ply: 3, san: "Nf3" },
];

describe("verifyBlockResults", () => {
  it("recomputes correct from the catalog, ignoring what the client claims", () => {
    const verified = verifyBlockResults(
      [
        { ply: 1, playedSan: "e4", elapsedMs: 1000 },
        { ply: 3, playedSan: "Bc4", elapsedMs: 2500.7 },
      ],
      expected,
    );
    expect(verified).toEqual([
      { ply: 1, expectedSan: "e4", playedSan: "e4", correct: true, elapsedMs: 1000 },
      { ply: 3, expectedSan: "Nf3", playedSan: "Bc4", correct: false, elapsedMs: 2501 },
    ]);
  });

  it("rejects an empty report (the instant-good forgery)", () => {
    expect(() => verifyBlockResults([], expected)).toThrow(/does not match/);
  });

  it("rejects a report missing a ply", () => {
    expect(() =>
      verifyBlockResults([{ ply: 1, playedSan: "e4", elapsedMs: 10 }], expected),
    ).toThrow(/does not match/);
  });

  it("rejects duplicate plies even when the count matches", () => {
    expect(() =>
      verifyBlockResults(
        [
          { ply: 1, playedSan: "e4", elapsedMs: 10 },
          { ply: 1, playedSan: "e4", elapsedMs: 10 },
        ],
        expected,
      ),
    ).toThrow(/does not match/);
  });

  it("rejects plies outside the block", () => {
    expect(() =>
      verifyBlockResults(
        [
          { ply: 1, playedSan: "e4", elapsedMs: 10 },
          { ply: 5, playedSan: "d4", elapsedMs: 10 },
        ],
        expected,
      ),
    ).toThrow(/does not match/);
  });

  it("rejects garbage SAN and invalid timings", () => {
    const ok = { ply: 3, playedSan: "Nf3", elapsedMs: 10 };
    expect(() =>
      verifyBlockResults([{ ply: 1, playedSan: "", elapsedMs: 10 }, ok], expected),
    ).toThrow(/Invalid/);
    expect(() =>
      verifyBlockResults(
        [{ ply: 1, playedSan: "x".repeat(50), elapsedMs: 10 }, ok],
        expected,
      ),
    ).toThrow(/Invalid/);
    expect(() =>
      verifyBlockResults([{ ply: 1, playedSan: "e4", elapsedMs: -5 }, ok], expected),
    ).toThrow(/Invalid/);
    expect(() =>
      verifyBlockResults([{ ply: 1, playedSan: "e4", elapsedMs: NaN }, ok], expected),
    ).toThrow(/Invalid/);
  });
});
