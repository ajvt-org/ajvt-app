import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminActivitiesPage from "./page";
import type { AttentionRow } from "@/lib/activityAttention";
import type { Activity } from "./activityTypes";

const data = { activities: [] as Activity[], waiting: [] as AttentionRow[], loading: false };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/Toast", () => ({ useToast: () => vi.fn() }));

vi.mock("./useActivitiesData", () => ({
  useActivitiesData: () => ({ ...data, reload: vi.fn() }),
}));

function activity(over: Partial<Activity> = {}): Activity {
  return {
    id: "a1",
    title: "كأس رابطة شباب التاكلالت",
    description: "",
    period: null,
    startsAt: null,
    endsAt: null,
    withTime: false,
    photo: null,
    capacity: null,
    isOpen: true,
    published: true,
    isTournament: true,
    isVolunteer: false,
    whatsappLink: null,
    order: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    registrations: [],
    pendingJoinRequests: 0,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  data.activities = [activity()];
  data.waiting = [];
  data.loading = false;
});

describe("the frame of the activities page", () => {
  it("keeps the search and the add button usable while the activities load", () => {
    data.loading = true;

    render(<AdminActivitiesPage />);

    expect(screen.getByPlaceholderText("بحث باسم النشاط...")).toBeTruthy();
    expect(screen.getByRole("button", { name: /إضافة نشاط/ })).toBeTruthy();
  });

  it("holds the regions in the same order before and after the activities land", () => {
    data.loading = true;
    const { unmount } = render(<AdminActivitiesPage />);
    const whileLoading = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"));
    unmount();

    data.loading = false;
    render(<AdminActivitiesPage />);

    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual(
      whileLoading,
    );
  });

  it("puts what needs attention above the filters", () => {
    const labels = ["ما يحتاج انتباهك", "تصفية الأنشطة", "قائمة الأنشطة"];

    render(<AdminActivitiesPage />);

    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual(labels);
  });

  it("shows the activities once they land", () => {
    render(<AdminActivitiesPage />);

    expect(screen.getByText("كأس رابطة شباب التاكلالت")).toBeTruthy();
  });

  it("says nothing is waiting rather than leaving the work region blank", () => {
    render(<AdminActivitiesPage />);

    expect(screen.getByText("لا شيء ينتظرك في الأنشطة")).toBeTruthy();
  });
});
