import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ConvertTournamentCard from "./ConvertTournamentCard";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";

const patch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function activity(isTournament: boolean): ActivityDetail["activity"] {
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
    isTournament,
    format: isTournament ? ("KNOCKOUT" as const) : null,
    profile: "FOOTBALL" as const,
    teamSize: null,
    isVolunteer: false,
    whatsappLink: null,
    registrations: [],
    teams: [],
    _count: { matches: 0, groups: 0 },
  };
}

function show(isTournament = false) {
  cleanup();
  const onChanged = vi.fn();
  render(<ConvertTournamentCard activity={activity(isTournament)} onChanged={onChanged} />);
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

    fireEvent.click(screen.getByText("بطولة أزواج"));
    fireEvent.click(screen.getAllByRole("button", { name: "تحويل إلى بطولة" })[1]);

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", {
        isTournament: true,
        format: "KNOCKOUT",
        profile: "BOARD",
        teamSize: "2",
      }),
    );
  });

  it("edits an existing tournament's settings through the same questions", async () => {
    show(true);

    fireEvent.click(screen.getByText("تعديل الإعدادات"));
    fireEvent.click(screen.getByText("بطولة فردية"));
    fireEvent.click(screen.getByText("حفظ الإعدادات"));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", {
        isTournament: true,
        format: "KNOCKOUT",
        profile: "BOARD",
        teamSize: "1",
      }),
    );
  });

  it("converts back with one click, since nothing needs answering", async () => {
    show(true);

    fireEvent.click(screen.getByText("إلغاء وضع البطولة"));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1", { isTournament: false }),
    );
  });
});
