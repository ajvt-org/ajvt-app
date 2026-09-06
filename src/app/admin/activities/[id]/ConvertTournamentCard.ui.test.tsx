import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ConvertTournamentCard from "./ConvertTournamentCard";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";
import { convertTournament, mvpVote, tournamentSetup } from "@/lib/texts";

const patch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function activity(
  isTournament: boolean,
  counts: { matches: number; playedMatches: number } = { matches: 0, playedMatches: 0 },
  over: Partial<ActivityDetail["activity"]> = {},
): ActivityDetail["activity"] {
  return {
    id: "a1",
    title: "أمسية",
    description: "",
    period: null,
    startsAt: null,
    endsAt: null,
    withTime: false,
    photo: null,
    capacity: null,
    isOpen: true,
    autoApprove: false,
    showScorersAndCards: true,
    isTournament,
    format: isTournament ? ("KNOCKOUT" as const) : null,
    matchShape: "FOOTBALL" as const,
    minTeamSize: null,
    maxTeamSize: null,
    organisedByHomeVillage: false,
    outsidePlayerLimit: null,
    mvpVoteMinutes: 120,
    isVolunteer: false,
    whatsappLink: null,
    registrations: [],
    teams: [],
    _count: { ...counts, groups: 0 },
    ...over,
  };
}

function disabled(label: string): boolean {
  return (screen.getByLabelText(label) as HTMLInputElement | HTMLSelectElement).disabled;
}

function show(
  isTournament = false,
  counts = { matches: 0, playedMatches: 0 },
  over: Partial<ActivityDetail["activity"]> = {},
) {
  cleanup();
  const onChanged = vi.fn();
  render(
    <ConvertTournamentCard activity={activity(isTournament, counts, over)} onChanged={onChanged} />,
  );
  return onChanged;
}

describe("ConvertTournamentCard", () => {
  beforeEach(() => {
    patch.mockReset();
    patch.mockResolvedValue({});
  });

  it("asks the setup questions before converting, and sends the answers", async () => {
    show();

    fireEvent.click(screen.getByText("تحويل إلى بطولة"));
    expect(patch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(tournamentSetup.shapes.SERIES));
    fireEvent.change(screen.getByLabelText(tournamentSetup.minTeamSize), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(tournamentSetup.maxTeamSize), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "تحويل إلى بطولة" })[1]);

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", {
        isTournament: true,
        format: "KNOCKOUT",
        matchShape: "SERIES",
        minTeamSize: "2",
        maxTeamSize: "2",
        organisedByHomeVillage: false,
        outsidePlayerLimit: "",
        mvpVoteMinutes: 120,
      }),
    );
  });

  it("edits an existing tournament's settings through the same questions", async () => {
    show(true);

    fireEvent.click(screen.getByText("تعديل الإعدادات"));
    fireEvent.click(screen.getByText(tournamentSetup.shapes.SERIES));
    fireEvent.change(screen.getByLabelText(tournamentSetup.minTeamSize), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(tournamentSetup.maxTeamSize), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByText("حفظ الإعدادات"));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", {
        isTournament: true,
        format: "KNOCKOUT",
        matchShape: "SERIES",
        minTeamSize: "1",
        maxTeamSize: "1",
        organisedByHomeVillage: false,
        outsidePlayerLimit: "",
        mvpVoteMinutes: 120,
      }),
    );
  });

  it("leaves the squad range open while the fixtures are drawn and nothing is played", () => {
    show(true, { matches: 4, playedMatches: 0 });

    fireEvent.click(screen.getByText("تعديل الإعدادات"));

    expect(disabled(tournamentSetup.minTeamSize)).toBe(false);
    expect(disabled(tournamentSetup.maxTeamSize)).toBe(false);
  });

  it("closes the squad range once a match has been played", () => {
    show(true, { matches: 4, playedMatches: 1 });

    fireEvent.click(screen.getByText("تعديل الإعدادات"));

    expect(disabled(tournamentSetup.minTeamSize)).toBe(true);
    expect(disabled(tournamentSetup.maxTeamSize)).toBe(true);
  });

  it("keeps the home village toggle open on a tournament that has begun", () => {
    show(true, { matches: 4, playedMatches: 1 });

    fireEvent.click(screen.getByText("تعديل الإعدادات"));

    expect(disabled(tournamentSetup.organisedByHomeVillage)).toBe(false);
  });

  it("closes the format as soon as a fixture exists", () => {
    show(true, { matches: 4, playedMatches: 0 });

    fireEvent.click(screen.getByText("تعديل الإعدادات"));

    expect(disabled(tournamentSetup.formatHeading)).toBe(true);
  });

  it("says what the mode gives without repeating the button that turns it on", () => {
    show(false);

    expect(screen.getByText(convertTournament.hint)).toBeTruthy();
    expect(convertTournament.hint).not.toContain(convertTournament.convert);
  });

  it("converts back with one click, since nothing needs answering", async () => {
    show(true);

    fireEvent.click(screen.getByText("إلغاء وضع البطولة"));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", { isTournament: false }),
    );
  });
});

describe("the vote duration", () => {
  beforeEach(() => {
    patch.mockReset();
    patch.mockResolvedValue({});
  });

  it("is offered as one field in the settings, with no card and no save of its own", () => {
    show(true);

    fireEvent.click(screen.getByText("تعديل الإعدادات"));

    expect((screen.getByLabelText(mvpVote.minutesLabel) as HTMLInputElement).value).toBe("120");
    expect(screen.queryByText("حفظ المدة")).toBeNull();
  });

  it("stays editable while the format and the squad are locked", () => {
    show(true, { matches: 4, playedMatches: 2 });

    fireEvent.click(screen.getByText("تعديل الإعدادات"));

    expect((screen.getByLabelText(mvpVote.minutesLabel) as HTMLInputElement).disabled).toBe(false);
    expect(disabled(tournamentSetup.minTeamSize)).toBe(true);
  });

  it("is not offered to a tournament whose matches are a series", () => {
    show(true, { matches: 0, playedMatches: 0 }, { matchShape: "SERIES" });

    fireEvent.click(screen.getByText("تعديل الإعدادات"));

    expect(screen.queryByLabelText(mvpVote.minutesLabel)).toBeNull();
  });

  it("goes up with the rest of the settings", async () => {
    show(true);

    fireEvent.click(screen.getByText("تعديل الإعدادات"));
    fireEvent.change(screen.getByLabelText(mvpVote.minutesLabel), { target: { value: "45" } });
    fireEvent.click(screen.getByText("حفظ الإعدادات"));

    await waitFor(() => expect(patch.mock.calls[0][1]).toMatchObject({ mvpVoteMinutes: 45 }));
  });
});
