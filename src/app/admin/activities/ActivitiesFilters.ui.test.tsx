import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivitiesFilters from "./ActivitiesFilters";
import type { ActivitiesView } from "./activitiesView";
import type { Activity } from "./activityTypes";

const onChange = vi.fn();

function activity(over: Partial<Activity> = {}): Activity {
  return {
    id: "a1",
    title: "دوري القرية",
    description: "",
    period: null,
    startsAt: null,
    endsAt: null,
    withTime: false,
    photo: null,
    capacity: null,
    isOpen: true,
    published: true,
    isTournament: false,
    isVolunteer: false,
    whatsappLink: null,
    order: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    registrations: [],
    pendingJoinRequests: 0,
    ...over,
  };
}

function view(over: Partial<ActivitiesView> = {}): ActivitiesView {
  return { q: "", type: "", state: "", stage: "all", waiting: "", ...over };
}

function show(activities: Activity[], filters = view()) {
  render(<ActivitiesFilters activities={activities} filters={filters} onChange={onChange} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the one bar the activities are filtered from", () => {
  it("uses one word for no filter in every row", () => {
    show([activity()]);

    expect(screen.getAllByLabelText(/: الكل$/).map((b) => b.getAttribute("aria-label"))).toEqual([
      "النوع: الكل",
      "التسجيل: الكل",
      "المرحلة: الكل",
    ]);
  });

  it("says how many each chip would show", () => {
    show([
      activity({ id: "t1", isTournament: true }),
      activity({ id: "t2", isTournament: true }),
      activity({ id: "v1", isVolunteer: true }),
    ]);

    expect(screen.getByLabelText("النوع: بطولات").textContent).toContain("2");
    expect(screen.getByLabelText("النوع: حملات").textContent).toContain("1");
    expect(screen.getByLabelText("النوع: عادية").textContent).toContain("0");
  });

  it("counts against what is already chosen", () => {
    show(
      [
        activity({ id: "t1", isTournament: true, isOpen: true }),
        activity({ id: "t2", isTournament: true, isOpen: false }),
      ],
      view({ state: "open" }),
    );

    expect(screen.getByLabelText("النوع: بطولات").textContent).toContain("1");
  });

  it("carries the stage alongside the other filters", async () => {
    show([activity()]);

    await userEvent.click(screen.getByLabelText("المرحلة: منتهية"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ stage: "finished" }));
  });

  it("marks the chip that is on", () => {
    show([activity()], view({ type: "tournament" }));

    expect(screen.getByLabelText("النوع: بطولات").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("النوع: الكل").getAttribute("aria-pressed")).toBe("false");
  });

  it("searches by title from the same bar", async () => {
    show([activity()]);

    await userEvent.type(screen.getByPlaceholderText("بحث باسم النشاط..."), "د");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ q: "د" }));
  });
});
