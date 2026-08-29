import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import BookingsForm from "./BookingsForm";
import type { Match, Team } from "./types";
import { matchAdmin as texts } from "@/lib/texts";

const postMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { post: (...args: unknown[]) => postMock(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const MATCH: Match = {
  id: "m1",
  homeTeam: { id: "t1", name: "الصقور", logo: null },
  awayTeam: { id: "t2", name: "النسور", logo: null },
  matchDate: null,
  round: null,
  venue: null,
  order: 0,
  isKnockout: false,
  bracketRound: null,
  homeScore: null,
  awayScore: null,
  homePenalties: null,
  awayPenalties: null,
  manOfTheMatch: null,
  forfeitWinnerTeamId: null,
  status: "SCHEDULED",
  goals: [],
  penaltyKicks: [],
  bookings: [],
  mvpVote: null,
};

const TEAMS: Team[] = [
  {
    id: "t1",
    name: "الصقور",
    autoNamed: false,
    logo: null,
    groupId: null,
    group: null,
    members: [
      {
        status: "ACTIVE",
        member: { id: "p1", fullName: "سالم", phone: "36000001", age: "البدريين", photo: null },
      },
    ],
  },
  {
    id: "t2",
    name: "النسور",
    autoNamed: false,
    logo: null,
    groupId: null,
    group: null,
    members: [],
  },
];

function show() {
  cleanup();
  render(<BookingsForm match={MATCH} teams={TEAMS} suspendedIds={[]} onChange={vi.fn()} />);
}

afterEach(() => {
  postMock.mockReset();
});

describe("the cards form", () => {
  it("names every control it asks for", () => {
    show();

    expect(screen.getByLabelText(texts.fieldTeam)).toBeDefined();
    expect(screen.getByLabelText(texts.fieldPlayer)).toBeDefined();
    expect(screen.getByLabelText(texts.fieldCard)).toBeDefined();
    expect(screen.getByLabelText(texts.fieldMinute)).toBeDefined();
  });

  it("will not add a card before a player is picked", () => {
    show();

    expect(screen.getByRole("button", { name: texts.addCard }).hasAttribute("disabled")).toBe(true);
  });

  it("sends the picked card with its minute", async () => {
    postMock.mockResolvedValue({});
    show();

    fireEvent.change(screen.getByLabelText(texts.fieldPlayer), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText(texts.fieldCard), { target: { value: "RED" } });
    fireEvent.change(screen.getByLabelText(texts.fieldMinute), { target: { value: "63" } });
    fireEvent.click(screen.getByRole("button", { name: texts.addCard }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toMatchObject({
      memberId: "p1",
      teamId: "t1",
      cardType: "RED",
      minute: "63",
    });
  });

  it("sends no minute when none was typed", async () => {
    postMock.mockResolvedValue({});
    show();

    fireEvent.change(screen.getByLabelText(texts.fieldPlayer), { target: { value: "p1" } });
    fireEvent.click(screen.getByRole("button", { name: texts.addCard }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toMatchObject({ minute: null });
  });
});
