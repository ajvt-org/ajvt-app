import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ConvertTournamentCard from "./ConvertTournamentCard";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";
import { tournamentSetup } from "@/lib/texts";

const patch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function activity(
  isTournament: boolean,
  counts: { matches: number; playedMatches: number } = { matches: 0, playedMatches: 0 },
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
    isVolunteer: false,
    whatsappLink: null,
    registrations: [],
    teams: [],
    _count: { ...counts, groups: 0 },
  };
}

function disabled(label: string): boolean {
  return (screen.getByLabelText(label) as HTMLInputElement | HTMLSelectElement).disabled;
}

function show(isTournament = false, counts = { matches: 0, playedMatches: 0 }) {
  cleanup();
  const onChanged = vi.fn();
  render(<ConvertTournamentCard activity={activity(isTournament, counts)} onChanged={onChanged} />);
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

  it("converts back with one click, since nothing needs answering", async () => {
    show(true);

    fireEvent.click(screen.getByText("إلغاء وضع البطولة"));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", { isTournament: false }),
    );
  });
});
