import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import BookingsForm from "./BookingsForm";
import type { DecidedMatch, Match, Team } from "./types";
import { matchAdmin as texts } from "@/lib/texts";

const postMock = vi.fn();
const patchMock = vi.fn();
const delMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    del: (...args: unknown[]) => delMock(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const MATCH: DecidedMatch = {
  id: "m1",
  firstTeam: { id: "t1", name: "الصقور", logo: null },
  secondTeam: { id: "t2", name: "النسور", logo: null },
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
  parts: [],
  series: null,
  mvpVote: null,
};

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
    members: [
      {
        status: "ACTIVE",
        member: {
          id: "p1",
          fullName: "سالم",
          phone: "36000001",
          age: "البدريين",
          village: "التاكلالت",
          photo: null,
        },
      },
    ],
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

const BOOKING = {
  id: "b1",
  cardType: "YELLOW" as const,
  minute: 40,
  teamId: "t1",
  member: { id: "p1", fullName: "سالم", photo: null },
};

function show(bookings: Match["bookings"] = []) {
  cleanup();
  render(
    <BookingsForm
      match={{ ...MATCH, bookings }}
      teams={TEAMS}
      suspendedIds={[]}
      onChange={vi.fn()}
    />,
  );
}

afterEach(() => {
  postMock.mockReset();
  patchMock.mockReset();
  delMock.mockReset();
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
      userId: "p1",
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

describe("fixing a card that was entered wrong", () => {
  it("offers an edit next to every card", () => {
    show([BOOKING]);

    expect(screen.getAllByLabelText(texts.edit)).toHaveLength(1);
  });

  it("loads the card into the form when editing starts", () => {
    show([BOOKING]);

    fireEvent.click(screen.getByLabelText(texts.edit));

    expect(screen.getByText(texts.editingCard)).toBeDefined();
    expect(screen.getByLabelText(texts.fieldMinute)).toHaveProperty("value", "40");
    expect(screen.getByLabelText(texts.fieldPlayer)).toHaveProperty("value", "p1");
  });

  it("saves against that card rather than adding another", async () => {
    patchMock.mockResolvedValue({});
    show([BOOKING]);

    fireEvent.click(screen.getByLabelText(texts.edit));
    fireEvent.change(screen.getByLabelText(texts.fieldMinute), { target: { value: "55" } });
    fireEvent.click(screen.getByRole("button", { name: texts.saveEdit }));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][0]).toBe("/api/admin/bookings/b1");
    expect(patchMock.mock.calls[0][1]).toMatchObject({ minute: "55", cardType: "YELLOW" });
    expect(postMock).not.toHaveBeenCalled();
  });

  it("goes back to adding when the edit is cancelled", () => {
    show([BOOKING]);

    fireEvent.click(screen.getByLabelText(texts.edit));
    fireEvent.click(screen.getByRole("button", { name: texts.cancelEdit }));

    expect(screen.queryByText(texts.editingCard)).toBeNull();
    expect(screen.getByRole("button", { name: texts.addCard })).toBeDefined();
  });

  it("removes a card through the api, so an error can be shown", async () => {
    delMock.mockResolvedValue({});
    show([BOOKING]);

    fireEvent.click(screen.getByLabelText(texts.remove));

    await waitFor(() => expect(delMock).toHaveBeenCalledWith("/api/admin/bookings/b1"));
  });
});
