import { describe, expect, it } from "vitest";
import { formatLineNotation } from "../notation";

const move = (ply: number, san: string) => ({ ply, san });

describe("formatLineNotation", () => {
  it("pairs plies into numbered moves", () => {
    expect(
      formatLineNotation([
        move(1, "e4"),
        move(2, "e5"),
        move(3, "Nf3"),
        move(4, "Nc6"),
      ]),
    ).toBe("1.e4 e5 2.Nf3 Nc6");
  });

  it("handles a line ending on a White move", () => {
    expect(
      formatLineNotation([move(1, "e4"), move(2, "c6"), move(3, "Nc3")]),
    ).toBe("1.e4 c6 2.Nc3");
  });

  it("sorts moves by ply regardless of input order", () => {
    expect(
      formatLineNotation([move(3, "Nf3"), move(1, "e4"), move(2, "e5")]),
    ).toBe("1.e4 e5 2.Nf3");
  });

  it("returns an empty string for no moves", () => {
    expect(formatLineNotation([])).toBe("");
  });
});
