import { describe, it, expect } from "vitest";
import { HOME_VILLAGE } from "@/lib/villages";
import { playerOverOutsideLimit, squadBreaches, type SquadSettings } from "@/lib/squadRules";

const home = (id: string) => ({ id, village: HOME_VILLAGE });
const away = (id: string) => ({ id, village: "أفجار" });

const VILLAGE_CUP: SquadSettings = {
  squad: { min: 16, max: 22 },
  organisedByTaguilalett: true,
  outsidePlayerLimit: 4,
};

const OPEN_CUP: SquadSettings = {
  squad: { min: null, max: null },
  organisedByTaguilalett: false,
  outsidePlayerLimit: null,
};

const VILLAGE_TEAM = { fromTaguilalett: true };
const GUEST_TEAM = { fromTaguilalett: false };

function squad(homeCount: number, awayCount = 0) {
  return [
    ...Array.from({ length: homeCount }, (_, i) => home(`h${i}`)),
    ...Array.from({ length: awayCount }, (_, i) => away(`a${i}`)),
  ];
}

describe("the size of a squad", () => {
  it("finds nothing wrong inside the range", () => {
    expect(squadBreaches(squad(16), VILLAGE_TEAM, VILLAGE_CUP)).toEqual([]);
    expect(squadBreaches(squad(18, 4), VILLAGE_TEAM, VILLAGE_CUP)).toEqual([]);
  });

  it("says a squad under the minimum is short, and by how much", () => {
    expect(squadBreaches(squad(15), VILLAGE_TEAM, VILLAGE_CUP)).toEqual([
      { kind: "tooFew", count: 15, min: 16 },
    ]);
  });

  it("says a squad over the maximum is over", () => {
    expect(squadBreaches(squad(19, 4), VILLAGE_TEAM, VILLAGE_CUP)).toEqual([
      { kind: "tooMany", count: 23, max: 22 },
    ]);
  });

  it("has nothing to say about a tournament that sets no size", () => {
    expect(squadBreaches(squad(2), GUEST_TEAM, OPEN_CUP)).toEqual([]);
  });
});

describe("players from outside the village", () => {
  it("counts them from the village on each account", () => {
    const breaches = squadBreaches(squad(12, 5), VILLAGE_TEAM, VILLAGE_CUP);

    expect(breaches).toEqual([
      { kind: "tooManyOutside", count: 5, limit: 4, overPlayerIds: ["a4"] },
    ]);
  });

  it("allows exactly the limit", () => {
    expect(squadBreaches(squad(12, 4), VILLAGE_TEAM, VILLAGE_CUP)).toEqual([]);
  });

  it("names every player past the limit, in roster order", () => {
    const breaches = squadBreaches(squad(10, 7), VILLAGE_TEAM, VILLAGE_CUP);

    expect(playerOverOutsideLimit(breaches, "a3")).toBe(false);
    expect(playerOverOutsideLimit(breaches, "a4")).toBe(true);
    expect(playerOverOutsideLimit(breaches, "a6")).toBe(true);
  });

  it("leaves a team that is not a village team alone", () => {
    expect(squadBreaches(squad(10, 8), GUEST_TEAM, VILLAGE_CUP)).toEqual([]);
  });

  it("leaves every team alone when the tournament is not run by the village", () => {
    const settings = { ...VILLAGE_CUP, organisedByTaguilalett: false };

    expect(squadBreaches(squad(10, 8), VILLAGE_TEAM, settings)).toEqual([]);
  });

  it("leaves every team alone when no limit is set", () => {
    const settings = { ...VILLAGE_CUP, outsidePlayerLimit: null };

    expect(squadBreaches(squad(10, 8), VILLAGE_TEAM, settings)).toEqual([]);
  });

  it("reports the size and the limit together when both are broken", () => {
    const breaches = squadBreaches(squad(3, 6), VILLAGE_TEAM, VILLAGE_CUP);

    expect(breaches.map((b) => b.kind)).toEqual(["tooFew", "tooManyOutside"]);
  });
});
