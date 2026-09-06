import { describe, it, expect } from "vitest";
import {
  anySideIs,
  bothSidesKnown,
  matchSideIds,
  matchSideTeams,
  noSideKnown,
  sideIdData,
} from "./matchSides";

const filled = {
  homeTeamId: "h",
  awayTeamId: "a",
  sideATeamId: null,
  sideBTeamId: null,
};

const series = {
  homeTeamId: null,
  awayTeamId: null,
  sideATeamId: "one",
  sideBTeamId: "two",
};

describe("matchSideIds", () => {
  it("takes home and away for a football match", () => {
    expect(matchSideIds(filled, "FOOTBALL")).toEqual({ first: "h", second: "a" });
  });

  it("takes the series pair for a series match", () => {
    expect(matchSideIds(series, "SERIES")).toEqual({ first: "one", second: "two" });
  });

  it("does not fall back to the other pair when its own is empty", () => {
    expect(matchSideIds(filled, "SERIES")).toEqual({ first: null, second: null });
    expect(matchSideIds(series, "FOOTBALL")).toEqual({ first: null, second: null });
  });
});

describe("matchSideTeams", () => {
  const teams = {
    homeTeam: { name: "المضيف" },
    awayTeam: { name: "الضيف" },
    sideATeam: { name: "الأول" },
    sideBTeam: { name: "الثاني" },
  };

  it("takes the pair its shape uses", () => {
    expect(matchSideTeams(teams, "FOOTBALL").first.name).toBe("المضيف");
    expect(matchSideTeams(teams, "SERIES").first.name).toBe("الأول");
  });
});

describe("sideIdData", () => {
  it("writes home and away for a football match", () => {
    expect(sideIdData("FOOTBALL", "h", "a")).toEqual({ homeTeamId: "h", awayTeamId: "a" });
  });

  it("writes the series pair for a series match", () => {
    expect(sideIdData("SERIES", "one", "two")).toEqual({
      sideATeamId: "one",
      sideBTeamId: "two",
    });
  });

  it("clears only the pair its shape uses", () => {
    expect(sideIdData("SERIES", null, null)).toEqual({ sideATeamId: null, sideBTeamId: null });
  });
});

describe("anySideIs", () => {
  it("asks all four columns, because a match fills one pair and not the other", () => {
    expect(anySideIs(["t1"]).OR).toHaveLength(4);
  });
});

describe("bothSidesKnown", () => {
  it("is true only when the pair its shape uses is full", () => {
    expect(bothSidesKnown(filled, "FOOTBALL")).toBe(true);
    expect(bothSidesKnown(filled, "SERIES")).toBe(false);
    expect(bothSidesKnown({ ...series, sideBTeamId: null }, "SERIES")).toBe(false);
  });
});

describe("noSideKnown", () => {
  it("is true only when the pair its shape uses is empty", () => {
    expect(noSideKnown(series, "FOOTBALL")).toBe(true);
    expect(noSideKnown(series, "SERIES")).toBe(false);
  });
});
