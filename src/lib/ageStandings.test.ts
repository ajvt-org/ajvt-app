import { describe, it, expect } from "vitest";
import { rankAgeGroups, membershipRate, sortStandings } from "@/lib/ageStandings";

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

  it("ranks by rate, so a smaller group that signed up more leads", () => {
    const counts = new Map([
      ["البدريين", 15],
      ["أشبال", 12],
      ["الفتيان", 3],
    ]);

    expect(rankAgeGroups(groups, counts).map((s) => s.name)).toEqual([
      "أشبال",
      "البدريين",
      "الفتيان",
    ]);
  });

  it("ranks by member count when asked", () => {
    const counts = new Map([
      ["البدريين", 15],
      ["أشبال", 12],
      ["الفتيان", 3],
    ]);

    expect(rankAgeGroups(groups, counts, new Map(), { key: "members" }).map((s) => s.name)).toEqual(
      ["البدريين", "أشبال", "الفتيان"],
    );
  });

  it("drops a group holding neither a member nor an account", () => {
    expect(rankAgeGroups(groups, new Map([["البدريين", 3]])).map((s) => s.name)).toEqual([
      "البدريين",
    ]);
  });

  it("keeps a group with no members when accounts on the app carry its name", () => {
    const standings = rankAgeGroups(groups, new Map([["البدريين", 3]]), new Map([["الفتيان", 4]]));

    expect(standings.map((s) => s.name)).toEqual(["البدريين", "الفتيان"]);
    expect(standings.at(-1)).toMatchObject({ members: 0, rate: 0, users: 4 });
  });

  it("closes the ranks up, so the list runs from one with no gaps", () => {
    const standings = rankAgeGroups(
      groups,
      new Map([
        ["البدريين", 3],
        ["أشبال", 8],
      ]),
    );

    expect(standings.map((s) => s.rank)).toEqual([1, 2]);
  });

  it("keeps every group for the record when asked to", () => {
    const standings = rankAgeGroups(groups, new Map([["البدريين", 3]]), new Map(), {
      keepEmpty: true,
    });

    expect(standings.map((s) => s.name)).toEqual(["البدريين", "أشبال", "الفتيان"]);
    expect(standings.at(-1)).toMatchObject({ members: 0, rate: 0 });
  });

  it("carries the declared headcount through", () => {
    const [top] = rankAgeGroups(groups, new Map([["أشبال", 10]]));

    expect(top).toMatchObject({ rank: 1, name: "أشبال", members: 10, total: 20, rate: 50 });
  });

  it("counts accounts apart from memberships", () => {
    const [top] = rankAgeGroups(groups, new Map([["أشبال", 10]]), new Map([["أشبال", 14]]), {
      key: "users",
    });

    expect(top).toMatchObject({ name: "أشبال", members: 10, users: 14, userRate: 70 });
  });

  it("lets accounts outnumber members, since pending and refused ones have accounts too", () => {
    const [top] = rankAgeGroups(groups, new Map([["أشبال", 5]]), new Map([["أشبال", 18]]), {
      key: "users",
    });

    expect(top.users).toBeGreaterThan(top.members);
  });
});

describe("sortStandings", () => {
  const rows = [
    { name: "أ", members: 10, users: 12, total: 40, rate: 25, userRate: 30 },
    { name: "ب", members: 8, users: 20, total: 20, rate: 40, userRate: 100 },
    { name: "ج", members: 9, users: 9, total: 30, rate: 30, userRate: 30 },
  ];

  it("orders by each of the five keys", () => {
    expect(sortStandings(rows, "members").map((r) => r.name)).toEqual(["أ", "ج", "ب"]);
    expect(sortStandings(rows, "rate").map((r) => r.name)).toEqual(["ب", "ج", "أ"]);
    expect(sortStandings(rows, "users").map((r) => r.name)).toEqual(["ب", "أ", "ج"]);
    expect(sortStandings(rows, "userRate").map((r) => r.name)).toEqual(["ب", "أ", "ج"]);
    expect(sortStandings(rows, "total").map((r) => r.name)).toEqual(["أ", "ج", "ب"]);
  });

  it("renumbers the ranks to follow the chosen order", () => {
    expect(sortStandings(rows, "members").map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(sortStandings(rows, "members")[0].name).toBe("أ");
    expect(sortStandings(rows, "rate")[0].name).toBe("ب");
  });

  it("breaks a tie on the name so the order never wobbles", () => {
    const tied = [
      { name: "ب", members: 5, users: 5, total: 10, rate: 50, userRate: 50 },
      { name: "أ", members: 5, users: 5, total: 10, rate: 50, userRate: 50 },
    ];

    expect(sortStandings(tied, "members").map((r) => r.name)).toEqual(["أ", "ب"]);
  });
});
