import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import DaysTab from "./DaysTab";
import { doubleBookedTeams } from "./daysTypes";
import type { DaysPayload, TournamentDayRow } from "./daysTypes";
import { daysTab, publicTournament } from "@/lib/texts";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    del: (...args: unknown[]) => del(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function match(id: string, home: string, away: string, iso: string) {
  return {
    id,
    matchDate: iso,
    round: null,
    venue: "ملعب القرية",
    status: "SCHEDULED" as const,
    homeScore: null,
    awayScore: null,
    homePenalties: null,
    awayPenalties: null,
    forfeitWinnerTeamId: null,
    homeTeam: { id: `${home}-id`, name: home },
    awayTeam: { id: `${away}-id`, name: away },
  };
}

function waiting(id: string, iso: string) {
  return { ...match(id, "x", "y", iso), homeTeam: null, awayTeam: null };
}

const PAYLOAD: DaysPayload = {
  startsAt: "2026-08-24T00:00:00.000Z",
  endsAt: "2026-08-26T00:00:00.000Z",
  days: [
    {
      id: "d1",
      position: 1,
      isRest: false,
      date: "2026-08-24T00:00:00.000Z",
      matches: [match("m1", "النجم", "الوحدة", "2026-08-24T16:00:00.000Z")],
    },
    { id: "d2", position: 2, isRest: true, date: "2026-08-25T00:00:00.000Z", matches: [] },
    { id: "d3", position: 3, isRest: false, date: "2026-08-26T00:00:00.000Z", matches: [] },
  ],
  unscheduled: [{ ...match("m9", "الأمل", "الفتح", ""), matchDate: null }],
};

async function show(payload: DaysPayload = PAYLOAD) {
  cleanup();
  get.mockResolvedValue(payload);
  const onMatchesChanged = vi.fn();
  render(<DaysTab activityId="a1" onMatchesChanged={onMatchesChanged} />);
  await waitFor(() => expect(get).toHaveBeenCalled());
  return onMatchesChanged;
}

describe("DaysTab", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
    del.mockReset();
    post.mockResolvedValue({});
    patch.mockResolvedValue({});
    del.mockResolvedValue({});
  });

  it("walks the days in order, rest day marked", async () => {
    await show();

    expect(await screen.findByText("اليوم 1")).toBeDefined();
    expect(screen.getByText("يوم راحة")).toBeDefined();
    expect(screen.getByText(/النجم × الوحدة/)).toBeDefined();
  });

  it("inserts a rest day at the clicked position", async () => {
    await show();

    fireEvent.click((await screen.findAllByLabelText(daysTab.addRestHere))[0]);

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/admin/activities/a1/days", {
        position: 2,
        isRest: true,
        notify: true,
      }),
    );
  });

  it("schedules an unscheduled match onto a chosen day and time", async () => {
    await show();

    fireEvent.change(screen.getByLabelText("اختيار اليوم"), { target: { value: "d3" } });
    fireEvent.click(screen.getByText("جدولة"));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/admin/activities/a1/days/assign", {
        matchId: "m9",
        dayId: "d3",
        time: "16:00",
      }),
    );
  });

  it("names a fixture whose teams are not known yet", async () => {
    await show({
      ...PAYLOAD,
      days: [
        {
          id: "d1",
          position: 1,
          isRest: false,
          date: "2026-08-24T00:00:00.000Z",
          matches: [waiting("m5", "2026-08-24T16:00:00.000Z")],
        },
      ],
      unscheduled: [{ ...waiting("m6", ""), matchDate: null }],
    });

    expect(await screen.findByText("اليوم 1")).toBeDefined();
    expect(screen.getAllByText(new RegExp(publicTournament.teamDecidedLater))).toHaveLength(2);
  });

  it("points at the activity details when no start date exists", async () => {
    await show({ startsAt: null, endsAt: null, days: [], unscheduled: [] });

    expect(await screen.findByText("حدد تاريخ بداية البطولة أولاً")).toBeDefined();
    expect(screen.getByText("فتح تفاصيل النشاط")).toBeDefined();
  });
});

describe("doubleBookedTeams", () => {
  it("names a team scheduled twice in one day, once", () => {
    const day: TournamentDayRow = {
      id: "d1",
      position: 1,
      isRest: false,
      date: null,
      matches: [
        match("m1", "النجم", "الوحدة", "2026-08-24T16:00:00.000Z"),
        match("m2", "النجم", "الأمل", "2026-08-24T17:00:00.000Z"),
      ],
    };

    expect(doubleBookedTeams(day)).toEqual(["النجم"]);
  });

  it("stays quiet for a clean day", () => {
    expect(doubleBookedTeams(PAYLOAD.days[0])).toEqual([]);
  });

  it("passes over a fixture whose teams are not known yet", () => {
    const day: TournamentDayRow = {
      id: "d1",
      position: 1,
      isRest: false,
      date: null,
      matches: [
        waiting("m1", "2026-08-24T16:00:00.000Z"),
        waiting("m2", "2026-08-24T17:00:00.000Z"),
      ],
    };

    expect(doubleBookedTeams(day)).toEqual([]);
  });
});

describe("adding a rest day between two days", () => {
  it("offers the seam between days rather than a control that outshouts them", async () => {
    await show();

    const inserter = screen.getAllByLabelText(daysTab.addRestHere)[0];

    expect(inserter.className).toContain("btn-sm");
    expect(inserter.textContent).toBe("");
    expect(inserter.style.border).toBe("");
    expect(inserter.style.background).toBe("");
  });

  it("keeps a rule on either side of it so it reads as a seam", async () => {
    await show();

    const inserter = screen.getAllByLabelText(daysTab.addRestHere)[0];
    const seam = inserter.parentElement!;

    expect(seam.querySelectorAll(".sep").length).toBe(2);
  });
});
