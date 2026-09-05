import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import MatchDetailsForm from "./MatchDetailsForm";
import { matchAdmin as texts } from "@/lib/texts";
import type { Match, Team } from "./types";

const patch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const TEAMS: Team[] = [
  {
    id: "t1",
    name: "الصقور",
    autoNamed: false,
    fromTaguilalett: true,
    logo: null,
    captainUserId: null,
    groupId: null,
    group: null,
    members: [],
  },
  {
    id: "t2",
    name: "النسور",
    autoNamed: false,
    fromTaguilalett: true,
    logo: null,
    captainUserId: null,
    groupId: null,
    group: null,
    members: [],
  },
];

const WAITING: Match = {
  id: "m1",
  homeTeam: null,
  awayTeam: null,
  matchDate: "2026-09-27T17:00:00.000Z",
  round: "نصف النهائي",
  venue: "ملعب القرية",
  order: 13,
  isKnockout: true,
  bracketRound: 1,
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  manOfTheMatch: null,
  forfeitWinnerTeamId: null,
  status: "SCHEDULED",
  goals: [],
  bookings: [],
  penaltyKicks: [],
  mvpVote: null,
};

function show(match: Match = WAITING) {
  cleanup();
  render(<MatchDetailsForm match={match} teams={TEAMS} onChange={vi.fn()} />);
}

beforeEach(() => {
  patch.mockReset();
  patch.mockResolvedValue({});
});

describe("setting the teams on a fixture that has none", () => {
  it("opens with neither side chosen", () => {
    show();

    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(selects.map((s) => s.value)).toEqual(["", ""]);
    expect(screen.getByText(texts.homeTeamPlaceholder)).toBeDefined();
    expect(screen.getByText(texts.awayTeamPlaceholder)).toBeDefined();
  });

  it("asks for both sides before saving", async () => {
    show();

    fireEvent.submit(screen.getByText(/حفظ التفاصيل/).closest("form")!);

    expect(await screen.findByText(texts.pickBothTeams)).toBeDefined();
    expect(patch).not.toHaveBeenCalled();
  });

  it("sends both teams once they are picked", async () => {
    show();

    const [home, away] = screen.getAllByRole("combobox");
    fireEvent.change(home, { target: { value: "t1" } });
    fireEvent.change(away, { target: { value: "t2" } });
    fireEvent.submit(screen.getByText(/حفظ التفاصيل/).closest("form")!);

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][1]).toMatchObject({ homeTeamId: "t1", awayTeamId: "t2" });
  });

  it("keeps the teams a fixture already has", () => {
    show({
      ...WAITING,
      homeTeam: { id: "t1", name: "الصقور", logo: null },
      awayTeam: { id: "t2", name: "النسور", logo: null },
    });

    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(selects.map((s) => s.value)).toEqual(["t1", "t2"]);
  });
});
