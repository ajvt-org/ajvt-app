import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MatchesList from "./MatchesList";
import type { Fixture } from "@/lib/memberFixtures";
import { memberMatches as texts } from "@/lib/texts";

function fixture(over: Partial<Fixture>): Fixture {
  return {
    id: "m1",
    matchDate: "2026-03-10T15:00:00.000Z",
    round: null,
    venue: null,
    status: "SCHEDULED",
    isKnockout: false,
    homeTeam: { id: "t1", name: "الصقور" },
    awayTeam: { id: "t2", name: "النسور" },
    homeScore: null,
    awayScore: null,
    homePenalties: null,
    awayPenalties: null,
    activity: { id: "a1", title: "بطولة الصيف" },
    myTeamId: "t1",
    ...over,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MatchesList", () => {
  it("leads with the matches that have a result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          teamCount: 1,
          upcoming: [fixture({ id: "later" })],
          past: [fixture({ id: "done", status: "PLAYED", homeScore: 2, awayScore: 1 })],
        }),
      }),
    );

    render(<MatchesList />);

    const headings = await waitFor(() => {
      const found = screen.getAllByText((text) => text === texts.past || text === texts.upcoming);
      expect(found).toHaveLength(2);
      return found;
    });
    expect(headings.map((h) => h.textContent)).toEqual([texts.past, texts.upcoming]);
  });
});
