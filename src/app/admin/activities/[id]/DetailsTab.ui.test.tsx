import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import DetailsTab from "./DetailsTab";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";
import { activityForm as texts } from "@/lib/texts";

const patch = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function activity(over: Partial<ActivityDetail["activity"]> = {}): ActivityDetail["activity"] {
  return {
    id: "a1",
    title: "دوري القرية",
    description: "بطولة",
    period: null,
    startsAt: null,
    endsAt: null,
    withTime: false,
    photo: null,
    capacity: null,
    isOpen: true,
    autoApprove: false,
    showScorersAndCards: true,
    isTournament: true,
    format: "KNOCKOUT",
    matchShape: "FOOTBALL",
    minTeamSize: null,
    maxTeamSize: null,
    organisedByHomeVillage: false,
    outsidePlayerLimit: null,
    isVolunteer: false,
    whatsappLink: null,
    registrations: [],
    teams: [],
    _count: { matches: 0, playedMatches: 0, groups: 0 },
    ...over,
  };
}

function show(over: Partial<ActivityDetail["activity"]> = {}) {
  cleanup();
  render(<DetailsTab activity={activity(over)} onSaved={vi.fn()} />);
}

describe("the scorers and cards toggle", () => {
  beforeEach(() => {
    patch.mockReset();
    patch.mockResolvedValue({});
  });

  it("offers the toggle on a football tournament", () => {
    show();

    expect(screen.getByLabelText(texts.showScorersAndCards)).toBeDefined();
  });

  it("leaves it out of a series tournament, where it controls nothing", () => {
    show({ matchShape: "SERIES" });

    expect(screen.queryByLabelText(texts.showScorersAndCards)).toBeNull();
    expect(screen.queryByText(texts.showScorersAndCardsHint)).toBeNull();
  });

  it("keeps the stored setting when the form is saved from a series tournament", async () => {
    show({ matchShape: "SERIES", showScorersAndCards: true });

    fireEvent.click(screen.getByText(texts.save));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][1]).toMatchObject({ showScorersAndCards: true });
  });

  it("leaves it out of a plain activity, which has no scorers to hide", () => {
    show({ isTournament: false, format: null });

    expect(screen.queryByLabelText(texts.showScorersAndCards)).toBeNull();
  });

  it("reads the state the tournament is already in", () => {
    show({ showScorersAndCards: false });

    expect((screen.getByLabelText(texts.showScorersAndCards) as HTMLInputElement).checked).toBe(
      false,
    );
  });

  it("sends the new state with the rest of the details", async () => {
    show();

    fireEvent.click(screen.getByLabelText(texts.showScorersAndCards));
    fireEvent.click(screen.getByText(texts.save));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][1]).toMatchObject({ showScorersAndCards: false });
  });
});

describe("the picture, which lives in the header now", () => {
  beforeEach(() => {
    patch.mockReset();
    patch.mockResolvedValue({});
  });

  it("is not in the details form", () => {
    show({ photo: "p.webp" });

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("button", { name: texts.activityPhoto })).toBeNull();
  });

  it("is left alone when the details are saved", async () => {
    show({ photo: "p.webp" });

    fireEvent.click(screen.getByText(texts.save));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][1]).not.toHaveProperty("photo");
  });
});
