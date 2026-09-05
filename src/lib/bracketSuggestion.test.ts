import { describe, it, expect } from "vitest";
import {
  meetingRound,
  suggestFirstKnockoutRound,
  type SuggestionGroup,
} from "@/lib/bracketSuggestion";
import type { StandingsRow } from "@/lib/standings";

function row(teamId: string, unresolved = false): StandingsRow {
  return {
    teamId,
    name: teamId,
    logo: null,
    photo: null,
    played: 3,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    cardPoints: 0,
    unresolved,
  };
}

function groups(count: number, perGroup = 4): SuggestionGroup[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `g${i}`,
    name: `المجموعة ${i + 1}`,
    standings: Array.from({ length: perGroup }, (_, p) => row(`g${i}p${p + 1}`)),
  }));
}

const pairNames = (gs: SuggestionGroup[], perGroup?: number) =>
  suggestFirstKnockoutRound(gs, perGroup).pairs.map((p) => `${p.home.teamId}-${p.away.teamId}`);

describe("suggesting the first knockout round", () => {
  it("puts each group winner against another group's runner up", () => {
    const { pairs } = suggestFirstKnockoutRound(groups(4));

    for (const pair of pairs) {
      expect(pair.home.position).toBe(1);
      expect(pair.away.position).toBe(2);
      expect(pair.home.groupId).not.toBe(pair.away.groupId);
    }
  });

  it("makes a semi final out of two groups", () => {
    expect(pairNames(groups(2))).toEqual(["g0p1-g1p2", "g1p1-g0p2"]);
  });

  it("makes a quarter final out of four groups", () => {
    expect(pairNames(groups(4))).toEqual(["g0p1-g1p2", "g2p1-g3p2", "g1p1-g0p2", "g3p1-g2p2"]);
  });

  it("makes a round of sixteen out of eight groups", () => {
    expect(suggestFirstKnockoutRound(groups(8)).pairs).toHaveLength(8);
  });

  it("keeps the two teams out of one group apart until the final, at every size", () => {
    for (const count of [2, 4, 8]) {
      const { pairs } = suggestFirstKnockoutRound(groups(count));
      const finalRound = Math.log2(count) + 1;
      for (let i = 0; i < count; i++) {
        const met = meetingRound(pairs, `g${i}p1`, `g${i}p2`);
        expect(met, `groups=${count} group=${i}`).toBe(finalRound);
      }
    }
  });

  it("never sends a team into two matches", () => {
    const { pairs } = suggestFirstKnockoutRound(groups(8));
    const seen = pairs.flatMap((p) => [p.home.teamId, p.away.teamId]);

    expect(new Set(seen).size).toBe(seen.length);
  });

  it("carries the group each qualifier came from, so the sheet can name it", () => {
    const { pairs } = suggestFirstKnockoutRound(groups(2));

    expect(pairs[0].home.groupName).toBe("المجموعة 1");
    expect(pairs[0].away.groupName).toBe("المجموعة 2");
  });
});

describe("when a bracket cannot be suggested", () => {
  it("refuses a tournament that was never split into groups", () => {
    expect(suggestFirstKnockoutRound(groups(1))).toEqual({ pairs: [], problem: "notGrouped" });
  });

  it("refuses a group count that leaves a qualifier field the bracket cannot halve", () => {
    for (const count of [3, 5, 6, 7]) {
      expect(suggestFirstKnockoutRound(groups(count)).problem, String(count)).toBe(
        "qualifierCount",
      );
    }
  });

  it("refuses a qualifier count per group that does not fill a bracket", () => {
    expect(suggestFirstKnockoutRound(groups(4), 3).problem).toBe("qualifierCount");
  });

  it("refuses a group with nobody to send through", () => {
    const gs = groups(2);
    gs[1].standings = [row("only")];

    expect(suggestFirstKnockoutRound(gs).problem).toBe("groupTooSmall");
  });
});

describe("when the group table is not settled", () => {
  it("still suggests, but says the places are not decided", () => {
    const gs = groups(2);
    gs[0].standings[1] = row("g0p2", true);
    gs[0].standings[2] = row("g0p3", true);

    const suggestion = suggestFirstKnockoutRound(gs);

    expect(suggestion.problem).toBe("unresolvedTie");
    expect(suggestion.pairs).toHaveLength(2);
  });

  it("says nothing when the tie is below the qualifying places", () => {
    const gs = groups(2, 5);
    gs[0].standings[2] = row("g0p3", true);
    gs[0].standings[3] = row("g0p4", true);

    expect(suggestFirstKnockoutRound(gs).problem).toBeNull();
  });

  it("warns when the tie is for the last qualifying place", () => {
    const gs = groups(2, 4);
    gs[0].standings[1] = row("g0p2", true);
    gs[0].standings[2] = row("g0p3", true);

    expect(suggestFirstKnockoutRound(gs).problem).toBe("unresolvedTie");
  });

  it("warns when the two who go through are level, since the seeding is not settled", () => {
    const gs = groups(2, 4);
    gs[0].standings[0] = row("g0p1", true);
    gs[0].standings[1] = row("g0p2", true);

    expect(suggestFirstKnockoutRound(gs).problem).toBe("unresolvedTie");
  });
});

describe("when more than two qualify from each group", () => {
  it("takes the top four of two groups into a round of eight", () => {
    expect(pairNames(groups(2, 4), 4)).toEqual([
      "g0p1-g1p4",
      "g0p2-g1p3",
      "g1p2-g0p3",
      "g1p1-g0p4",
    ]);
  });

  it("takes only the winners when one qualifies from each group", () => {
    expect(pairNames(groups(4), 1)).toEqual(["g0p1-g1p1", "g2p1-g3p1"]);
  });

  it("refuses a group that is too small to send that many through", () => {
    expect(suggestFirstKnockoutRound(groups(2, 3), 4).problem).toBe("groupTooSmall");
  });

  it("only looks at the qualifying places when it warns about a tie", () => {
    const gs = groups(4, 4);
    gs[0].standings[1] = row("g0p2", true);
    gs[0].standings[2] = row("g0p3", true);

    expect(suggestFirstKnockoutRound(gs, 1).problem).toBeNull();
    expect(suggestFirstKnockoutRound(gs, 2).problem).toBe("unresolvedTie");
  });
});
