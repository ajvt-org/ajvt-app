import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { tournamentPanels } from "./tournamentPanels";
import type { ActivityPageData } from "./activityQuery";

vi.mock("@/lib/suspensionServer", () => ({ suspendedUserIds: async () => new Set<string>() }));

function entrant(id: string, name: string) {
  return {
    id,
    name,
    autoNamed: false,
    logo: null,
    groupId: null,
    captainUserId: null,
    members: [],
  };
}

function tournament(over: Partial<ActivityPageData> = {}): ActivityPageData {
  return {
    id: "a1",
    title: "كأس التاكلالت",
    isTournament: true,
    format: "KNOCKOUT",
    matchShape: "FOOTBALL",
    partWord: null,
    showScorersAndCards: true,
    minTeamSize: null,
    maxTeamSize: null,
    groups: [],
    teams: [entrant("t1", "الأول"), entrant("t2", "الثاني")],
    matches: [],
    ...over,
  } as unknown as ActivityPageData;
}

async function panelKeys(activity: ActivityPageData) {
  const { panels } = await tournamentPanels(activity, null, new Map());
  return panels.map((panel) => panel.key);
}

describe("tournamentPanels", () => {
  it("gives a knockout a bracket and never standings, with nothing drawn", async () => {
    expect(await panelKeys(tournament())).toContain("bracket");
    expect(await panelKeys(tournament())).not.toContain("standings");
  });

  it("still gives a knockout a bracket once the draw is made", async () => {
    const drawn = tournament({
      matches: [
        {
          id: "m1",
          bracketRound: 1,
          order: 1,
          round: "النهائي",
          status: "SCHEDULED",
          isKnockout: true,
          matchDate: null,
          goals: [],
          bookings: [],
          penaltyKicks: [],
          adjustments: [],
          parts: [],
          firstTeam: null,
          secondTeam: null,
          series: null,
          mvpVote: null,
          manOfTheMatch: null,
        },
      ],
    } as unknown as Partial<ActivityPageData>);
    expect(await panelKeys(drawn)).toContain("bracket");
    expect(await panelKeys(drawn)).not.toContain("standings");
  });

  it("says the draw has not been made instead of an empty bracket", async () => {
    const { panels } = await tournamentPanels(tournament(), null, new Map());
    const bracket = panels.find((panel) => panel.key === "bracket");
    render(<>{bracket?.content}</>);
    expect(screen.getByText("لم تُجرَ القرعة بعد")).toBeDefined();
  });

  it("keeps standings for a group stage followed by a knockout", async () => {
    const keys = await panelKeys(tournament({ format: "GROUPS_THEN_KNOCKOUT" }));
    expect(keys).toContain("standings");
    expect(keys).not.toContain("bracket");
  });
});
