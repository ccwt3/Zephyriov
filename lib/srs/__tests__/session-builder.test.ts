import { describe, expect, it } from "vitest";
import { buildSession, type CandidateLine } from "../session-builder";

const TODAY = "2026-07-14";
// Deterministic rng that never shuffles.
const rng = () => 0.999999;

function line(
  id: string,
  openingId: string,
  state: "new" | "review",
  dueDate = TODAY,
): CandidateLine {
  return { userLineId: id, openingId, state, dueDate };
}

describe("buildSession", () => {
  it("picks one new line per opening (round-robin) up to the target", () => {
    const candidates = [
      line("a1", "opA", "new"),
      line("a2", "opA", "new"),
      line("b1", "opB", "new"),
      line("c1", "opC", "new"),
    ];
    const plan = buildSession({ candidates, today: TODAY, newLinesTarget: 3, rng });
    const openings = plan.items.map(
      (i) => candidates.find((c) => c.userLineId === i.userLineId)!.openingId,
    );
    expect(plan.items).toHaveLength(3);
    expect(new Set(openings).size).toBe(3);
  });

  it("repeats openings only after covering all of them", () => {
    const candidates = [
      line("a1", "opA", "new"),
      line("a2", "opA", "new"),
      line("b1", "opB", "new"),
    ];
    const plan = buildSession({ candidates, today: TODAY, newLinesTarget: 3, rng });
    expect(plan.items).toHaveLength(3);
  });

  it("includes all due reviews after the new lines", () => {
    const candidates = [
      line("n1", "opA", "new"),
      line("r1", "opB", "review", "2026-07-10"),
      line("r2", "opC", "review", TODAY),
    ];
    const plan = buildSession({ candidates, today: TODAY, newLinesTarget: 6, rng });
    expect(plan.items.map((i) => i.itemType)).toEqual(["new", "review", "review"]);
  });

  it("excludes reviews that are not due yet (spec 6.3)", () => {
    const candidates = [
      line("r1", "opA", "review", "2026-07-15"),
      line("r2", "opB", "review", "2026-07-14"),
    ];
    const plan = buildSession({ candidates, today: TODAY, newLinesTarget: 0, rng });
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].userLineId).toBe("r2");
  });

  it("handles an exhausted new pool gracefully", () => {
    const candidates = [line("n1", "opA", "new")];
    const plan = buildSession({ candidates, today: TODAY, newLinesTarget: 6, rng });
    expect(plan.items).toHaveLength(1);
  });
});
