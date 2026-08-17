import { describe, it, expect } from "vitest";
import { rankAgeGroups, membershipRate } from "@/lib/ageStandings";

describe("membershipRate", () => {
  it("is a whole percentage", () => {
    expect(membershipRate(15, 30)).toBe(50);
    expect(membershipRate(1, 3)).toBe(33);
  });

  it("is zero when the group has no declared headcount", () => {
    expect(membershipRate(5, 0)).toBe(0);
  });

  it("never exceeds a hundred when more joined than were counted", () => {
    expect(membershipRate(40, 30)).toBe(100);
  });
});

describe("rankAgeGroups", () => {
  const groups = [
    { name: "البدريين", totalCount: 30 },
    { name: "أشبال", totalCount: 20 },
    { name: "الفتيان", totalCount: 30 },
  ];

  it("ranks by member count, not by rate", () => {
    const counts = new Map([
      ["البدريين", 15],
      ["أشبال", 18],
    ]);

    expect(rankAgeGroups(groups, counts).map((s) => s.name)).toEqual([
      "أشبال",
      "البدريين",
      "الفتيان",
    ]);
  });

  it("gives a group with no members a rank and a zero rate", () => {
    const last = rankAgeGroups(groups, new Map([["البدريين", 3]])).at(-1)!;

    expect(last.members).toBe(0);
    expect(last.rate).toBe(0);
  });

  it("carries the declared headcount through", () => {
    const [top] = rankAgeGroups(groups, new Map([["أشبال", 10]]));

    expect(top).toMatchObject({ rank: 1, name: "أشبال", members: 10, total: 20, rate: 50 });
  });
});
