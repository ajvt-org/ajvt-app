import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import MatchDetailsForm from "./MatchDetailsForm";
import { matchAdmin as texts } from "@/lib/texts";
import { entrantWording } from "@/lib/messages";
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
    fromHomeVillage: true,
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
    fromHomeVillage: true,
    logo: null,
    captainUserId: null,
    groupId: null,
    group: null,
    members: [],
  },
];

const WAITING: Match = {
  id: "m1",
  firstTeam: null,
  secondTeam: null,
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
  parts: [],
  adjustments: [],
  series: null,
  mvpVote: null,
};

function show(match: Match = WAITING, entrant: "team" | "player" = "team") {
  cleanup();
  render(
    <MatchDetailsForm match={match} teams={TEAMS} entrant={entrant} football onChange={vi.fn()} />,
  );
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

  it("saves the date, the venue and the round while both sides are still unknown", async () => {
    show();

    fireEvent.submit(screen.getByText(/حفظ التفاصيل/).closest("form")!);

    await waitFor(() => expect(patch).toHaveBeenCalled());
    const sent = patch.mock.calls[0][1] as Record<string, unknown>;
    expect(sent).toMatchObject({ round: "نصف النهائي", venue: "ملعب القرية" });
    expect(sent.matchDate).toBeTruthy();
    expect("firstTeamId" in sent).toBe(false);
    expect("secondTeamId" in sent).toBe(false);
  });

  it("refuses a fixture with one side chosen and says both or neither", async () => {
    show();

    const [home] = screen.getAllByRole("combobox");
    fireEvent.change(home, { target: { value: "t1" } });
    fireEvent.submit(screen.getByText(/حفظ التفاصيل/).closest("form")!);

    expect(await screen.findByText(entrantWording("team").bothEntrantsOrNeither)).toBeDefined();
    expect(patch).not.toHaveBeenCalled();
  });

  it("names the players rather than the teams in a singles tournament", async () => {
    show(WAITING, "player");

    const [home] = screen.getAllByRole("combobox");
    fireEvent.change(home, { target: { value: "t1" } });
    fireEvent.submit(screen.getByText(/حفظ التفاصيل/).closest("form")!);

    expect(await screen.findByText(entrantWording("player").bothEntrantsOrNeither)).toBeDefined();
  });

  it("leaves the sides alone when both selects are emptied on a fixture that had them", async () => {
    show({
      ...WAITING,
      firstTeam: { id: "t1", name: "الصقور", logo: null },
      secondTeam: { id: "t2", name: "النسور", logo: null },
    });

    const [home, away] = screen.getAllByRole("combobox");
    fireEvent.change(home, { target: { value: "" } });
    fireEvent.change(away, { target: { value: "" } });
    fireEvent.submit(screen.getByText(/حفظ التفاصيل/).closest("form")!);

    await waitFor(() => expect(patch).toHaveBeenCalled());
    const sent = patch.mock.calls[0][1] as Record<string, unknown>;
    expect("firstTeamId" in sent).toBe(false);
    expect("secondTeamId" in sent).toBe(false);
  });

  it("sends both teams once they are picked", async () => {
    show();

    const [home, away] = screen.getAllByRole("combobox");
    fireEvent.change(home, { target: { value: "t1" } });
    fireEvent.change(away, { target: { value: "t2" } });
    fireEvent.submit(screen.getByText(/حفظ التفاصيل/).closest("form")!);

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][1]).toMatchObject({ firstTeamId: "t1", secondTeamId: "t2" });
  });

  it("keeps the teams a fixture already has", () => {
    show({
      ...WAITING,
      firstTeam: { id: "t1", name: "الصقور", logo: null },
      secondTeam: { id: "t2", name: "النسور", logo: null },
    });

    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(selects.map((s) => s.value)).toEqual(["t1", "t2"]);
  });
});

const GROUPED: Team[] = TEAMS.map((t) => ({ ...t, groupId: "g1" }));

const GROUP_FIXTURE: Match = {
  ...WAITING,
  firstTeam: { id: "t1", name: "الصقور", logo: null },
  secondTeam: { id: "t2", name: "النسور", logo: null },
  round: "الجولة 1",
  isKnockout: false,
  bracketRound: null,
};

function showWith(match: Match, teams: Team[]) {
  cleanup();
  render(
    <MatchDetailsForm match={match} teams={teams} entrant="team" football onChange={vi.fn()} />,
  );
}

describe("the knockout toggle on a group fixture", () => {
  it("is not offered when both sides sit in a group", () => {
    showWith(GROUP_FIXTURE, GROUPED);

    expect(screen.queryByText(texts.knockoutMatch)).toBeNull();
  });

  it("stays on a fixture whose sides belong to no group", () => {
    showWith(GROUP_FIXTURE, TEAMS);

    expect(screen.getByText(texts.knockoutMatch)).toBeDefined();
  });

  it("stays on a match the bracket made", () => {
    showWith({ ...GROUP_FIXTURE, isKnockout: true, bracketRound: 1 }, GROUPED);

    expect(screen.getByText(texts.knockoutMatch)).toBeDefined();
  });

  it("sends the group fixture on as a group fixture", async () => {
    showWith(GROUP_FIXTURE, GROUPED);

    fireEvent.submit(screen.getByText(/حفظ التفاصيل/).closest("form")!);

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][1]).toMatchObject({ isKnockout: false });
  });
});
