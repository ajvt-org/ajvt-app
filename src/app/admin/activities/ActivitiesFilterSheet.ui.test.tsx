import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivitiesFilterSheet from "./ActivitiesFilterSheet";
import type { ActivitiesView } from "./activitiesView";
import type { Activity } from "./activityTypes";

const onChange = vi.fn();
const onClose = vi.fn();

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
  render(
    <ActivitiesFilterSheet
      activities={activities}
      filters={filters}
      onChange={onChange}
      onClose={onClose}
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the sheet the activities are filtered from", () => {
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
        activity({ id: "p1", isOpen: true }),
      ],
      view({ state: "open" }),
    );

    expect(screen.getByLabelText("النوع: بطولات").textContent).toContain("1");
  });

  it("leaves an option that would show nothing where it is, and not pressable", () => {
    show([
      activity({ id: "t1", isTournament: true }),
      activity({ id: "t2", isTournament: true }),
      activity({ id: "v1", isVolunteer: true }),
    ]);

    expect(screen.getByLabelText("النوع: عادية")).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("النوع: حملات")).toHaveProperty("disabled", false);
  });

  it("holds every row whatever is chosen", async () => {
    show(mixed());
    const before = screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"));

    await userEvent.click(screen.getByLabelText("النوع: بطولات"));

    expect(screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(before);
    expect(before).toEqual(["النوع", "التسجيل", "المرحلة"]);
  });

  it("carries the stage alongside the other filters", async () => {
    show(mixed());

    await userEvent.click(screen.getByLabelText("المرحلة: منتهية"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ stage: "finished" }));
  });

  it("marks the chip that is on", () => {
    show(mixed(), view({ type: "tournament" }));

    expect(screen.getByLabelText("النوع: بطولات").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("النوع: الكل").getAttribute("aria-pressed")).toBe("false");
  });

  it("offers a way back to no filter at all", async () => {
    show(mixed(), view({ type: "tournament", stage: "finished", q: "دوري" }));

    await userEvent.click(screen.getByRole("button", { name: /إزالة التصفية/ }));

    expect(onChange).toHaveBeenCalledWith({
      q: "دوري",
      type: "",
      state: "",
      stage: "current",
      waiting: "",
    });
  });

  it("keeps the way back out of sight while nothing is filtered", () => {
    show(mixed(), view({ stage: "current" }));

    expect(screen.queryByRole("button", { name: /إزالة التصفية/ })).toBeNull();
  });

  it("closes on the reader's word and leaves the filters alone", async () => {
    show(mixed(), view({ type: "tournament" }));

    await userEvent.click(screen.getByRole("button", { name: "تم" }));

    expect(onClose).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
