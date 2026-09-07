import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityOrderPage from "./page";
import type { Activity } from "../activityTypes";

const patch = vi.fn();
const reload = vi.fn();
const activities: Activity[] = [];

vi.mock("@/lib/api", () => ({
  api: { patch: (...a: unknown[]) => patch(...a) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("@/components/Toast", () => ({ useToast: () => vi.fn() }));

vi.mock("../useActivitiesData", () => ({
  useActivitiesData: () => ({ activities, loading: false, reload }),
}));

function activity(
  id: string,
  title: string,
  order: number,
  over: Partial<Activity> = {},
): Activity {
  return {
    id,
    title,
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
    order,
    createdAt: "2026-08-01T00:00:00.000Z",
    registrations: [],
    pendingJoinRequests: 0,
    ...over,
  };
}

function load(rows: Activity[]) {
  activities.length = 0;
  activities.push(...rows);
}

beforeEach(() => {
  vi.clearAllMocks();
  patch.mockResolvedValue({});
  load([
    activity("a", "بطولة الشطرنج", 0),
    activity("b", "بطولة البلاي ستيشن", 1),
    activity("c", "حملة النظافة", 2, { startsAt: "2026-01-01", endsAt: "2026-01-02" }),
  ]);
});

describe("arranging how the activities show", () => {
  it("says the one thing the arrows cannot say for themselves", () => {
    render(<ActivityOrderPage />);

    expect(screen.getByText("الأسهم ترتّب النشاط داخل مرحلته فقط.")).toBeTruthy();
  });

  it("does not name itself again under the link that named it", () => {
    render(<ActivityOrderPage />);

    expect(screen.queryByText("ترتيب ظهور الأنشطة")).toBeNull();
  });

  it("shows each activity the way the list does, so two names apart tell apart", () => {
    load([
      activity("a", "بطولة الشطرنج", 0, { isTournament: true, photo: "a.jpg" }),
      activity("b", "حملة النظافة", 1, {
        isVolunteer: true,
        startsAt: "2026-09-10",
        endsAt: "2026-09-12",
      }),
    ]);
    render(<ActivityOrderPage />);

    expect(screen.getByText("بطولة")).toBeTruthy();
    expect(screen.getByText("حملة تطوعية")).toBeTruthy();
    expect(document.querySelectorAll("img").length).toBe(1);
    expect(document.querySelectorAll(".activity-thumb").length).toBe(2);
  });

  it("keeps the arrows at the end of a row that now carries more", () => {
    render(<ActivityOrderPage />);

    const row = screen.getByLabelText(/تقديم بطولة البلاي ستيشن/).closest("div");
    expect(row?.textContent).toContain("بطولة البلاي ستيشن");
  });

  it("groups the finished ones apart from the rest", () => {
    render(<ActivityOrderPage />);

    expect(screen.getByText("منتهية")).toBeTruthy();
    expect(screen.getByText("بلا تاريخ — التسجيل مفتوح")).toBeTruthy();
  });

  it("cannot move the first of a stage up", () => {
    render(<ActivityOrderPage />);

    expect(screen.getByLabelText(/تقديم بطولة الشطرنج/)).toHaveProperty("disabled", true);
  });

  it("cannot move the last of a stage down", () => {
    render(<ActivityOrderPage />);

    expect(screen.getByLabelText(/تأخير بطولة البلاي ستيشن/)).toHaveProperty("disabled", true);
  });

  it("saves both sides of a swap and reloads", async () => {
    render(<ActivityOrderPage />);

    await userEvent.click(screen.getByLabelText(/تقديم بطولة البلاي ستيشن/));

    expect(patch).toHaveBeenCalledWith("/api/admin/activities/b", { order: 0 });
    expect(patch).toHaveBeenCalledWith("/api/admin/activities/a", { order: 1 });
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it("leaves an activity alone in its own stage", () => {
    render(<ActivityOrderPage />);

    expect(screen.getByLabelText(/تقديم حملة النظافة/)).toHaveProperty("disabled", true);
    expect(screen.getByLabelText(/تأخير حملة النظافة/)).toHaveProperty("disabled", true);
  });

  it("says so when there is nothing to arrange", () => {
    load([]);
    render(<ActivityOrderPage />);

    expect(screen.getByText("لا توجد أنشطة لترتيبها")).toBeTruthy();
  });

  it("offers the way back to the list", () => {
    render(<ActivityOrderPage />);

    const back = screen
      .getAllByRole("link")
      .find((l) => l.getAttribute("href") === "/admin/activities");
    expect(back).toBeTruthy();
  });
});
