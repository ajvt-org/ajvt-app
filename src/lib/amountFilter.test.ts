import { describe, it, expect } from "vitest";
import {
  NO_AMOUNT,
  amountFigure,
  amountIsSet,
  matchesAmount,
  readAmountFilter,
  writeAmountFilter,
} from "./amountFilter";

describe("the figure an admin typed", () => {
  it("reads a whole number", () => {
    expect(amountFigure({ op: "gt", figure: "500" })).toBe(500);
    expect(amountFigure({ op: "gt", figure: " 0 " })).toBe(0);
  });

  it("reads nothing from an empty or half typed figure", () => {
    for (const figure of ["", "  ", "-5", "5.5", "abc", "1e3"]) {
      expect(amountFigure({ op: "gt", figure }), figure).toBeNull();
    }
  });

  it("is set only once there is a figure", () => {
    expect(amountIsSet(NO_AMOUNT)).toBe(false);
    expect(amountIsSet({ op: "eq", figure: "500" })).toBe(true);
  });
});

describe("carrying the amount filter in the address", () => {
  it("writes the operator and the figure as one value", () => {
    expect(writeAmountFilter({ op: "lt", figure: "500" })).toBe("lt:500");
  });

  it("writes nothing while there is no figure, whatever the operator", () => {
    expect(writeAmountFilter({ op: "eq", figure: "" })).toBe("");
  });

  it("survives a round trip", () => {
    for (const op of ["eq", "lt", "gt"] as const) {
      const filter = { op, figure: "1500" };
      expect(readAmountFilter(writeAmountFilter(filter))).toEqual(filter);
    }
  });

  it("reads no filter from a missing or broken value", () => {
    for (const raw of [null, "", "gt", "gt:", "gt:abc", "over:500", "500"]) {
      expect(readAmountFilter(raw), String(raw)).toEqual(NO_AMOUNT);
    }
  });
});

describe("matching an amount", () => {
  it("keeps everything while no figure is set", () => {
    expect(matchesAmount(500, NO_AMOUNT)).toBe(true);
    expect(matchesAmount(null, NO_AMOUNT)).toBe(true);
  });

  it("matches equal to the figure only", () => {
    const filter = { op: "eq" as const, figure: "500" };
    expect(matchesAmount(500, filter)).toBe(true);
    expect(matchesAmount(499, filter)).toBe(false);
  });

  it("matches strictly under the figure", () => {
    const filter = { op: "lt" as const, figure: "500" };
    expect(matchesAmount(499, filter)).toBe(true);
    expect(matchesAmount(500, filter)).toBe(false);
  });

  it("matches strictly over the figure", () => {
    const filter = { op: "gt" as const, figure: "500" };
    expect(matchesAmount(501, filter)).toBe(true);
    expect(matchesAmount(500, filter)).toBe(false);
  });

  it("drops a missing amount under every operator", () => {
    for (const op of ["eq", "lt", "gt"] as const) {
      expect(matchesAmount(null, { op, figure: "0" }), op).toBe(false);
      expect(matchesAmount(undefined, { op, figure: "0" }), op).toBe(false);
    }
  });
});
