import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivitiesFilters from "./ActivitiesFilters";
import type { ActivitiesView } from "./activitiesView";
import type { Activity } from "./activityTypes";

const onChange = vi.fn();
const onSelectingChange = vi.fn();

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
  return { q: "", type: "", state: "", stage: "current", waiting: "", ...over };
}

function show(activities: Activity[], filters = view(), selecting = false) {
  render(
    <ActivitiesFilters
      activities={activities}
      filters={filters}
      selecting={selecting}
      onChange={onChange}
      onSelectingChange={onSelectingChange}
    />,
  );
}

const FINISHED = { startsAt: "2020-01-01T00:00:00.000Z", endsAt: "2020-01-02T00:00:00.000Z" };

const mixed = () => [
  activity({ id: "t1", isTournament: true }),
  activity({ id: "v1", isVolunteer: true }),
  activity({ id: "p1", isOpen: false }),
  activity({ id: "f1", ...FINISHED }),
];

const filterButton = () => screen.getByRole("button", { name: /تصفية/ });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the bar the activities are narrowed from", () => {
  it("searches by title from the bar itself", async () => {
    show(mixed());

    await userEvent.type(screen.getByPlaceholderText("بحث باسم النشاط..."), "د");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ q: "د" }));
  });

  it("leaves the list its height until the reader asks to filter", () => {
    show(mixed());

    expect(screen.queryByLabelText(/^النوع/)).toBeNull();
    expect(filterButton()).toBeTruthy();
  });

  it("opens the axes over the list", async () => {
    show(mixed());

    await userEvent.click(filterButton());

    expect(screen.getByLabelText("النوع: بطولات")).toBeTruthy();
    expect(screen.getByLabelText("المرحلة: كل المراحل")).toBeTruthy();
  });

  it("says on arrival how many filters the address already carries", () => {
    show(mixed(), view({ type: "tournament", stage: "finished" }));

    expect(filterButton().textContent).toContain("2");
  });

  it("counts nothing when the address carries nothing", () => {
    show(mixed());

    expect(filterButton().textContent).not.toMatch(/[0-9]/);
  });

  it("keeps the way in where it is even when no axis can narrow", () => {
    show([activity({ id: "t1", isTournament: true }), activity({ id: "t2", isTournament: true })]);

    expect(filterButton()).toBeTruthy();
  });

  it("offers no filtering at all before there is a single activity", () => {
    show([]);

    expect(screen.queryByRole("button", { name: /تصفية/ })).toBeNull();
    expect(screen.getByPlaceholderText("بحث باسم النشاط...")).toBeTruthy();
  });
});

describe("starting a selection", () => {
  it("offers the mode from the same bar as the search", async () => {
    show([activity()]);

    await userEvent.click(screen.getByRole("button", { name: /تحديد/ }));

    expect(onSelectingChange).toHaveBeenCalledWith(true);
  });

  it("offers the way back out once it is on", async () => {
    show([activity()], view(), true);

    expect(screen.getByRole("button", { name: /تحديد/ }).getAttribute("aria-pressed")).toBe("true");

    await userEvent.click(screen.getByRole("button", { name: /تحديد/ }));

    expect(onSelectingChange).toHaveBeenCalledWith(false);
  });

  it("keeps the way into a selection out of the filters", () => {
    show([activity()]);

    expect(screen.getByRole("button", { name: /تحديد/ })).toBeTruthy();
    expect(screen.queryByLabelText(/^النوع/)).toBeNull();
  });
});
