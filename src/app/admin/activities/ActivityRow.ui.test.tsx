import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import ActivityRow from "./ActivityRow";
import type { Activity } from "./activityTypes";

const controls = {
  busy: false,
  setPublished: vi.fn(),
  setOpen: vi.fn(),
  duplicate: vi.fn(),
};

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

function show(over: Partial<Activity> = {}) {
  render(<ActivityRow activity={activity(over)} controls={controls} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("what an activity row says is waiting", () => {
  it("says a team is waiting to join", () => {
    show({ pendingJoinRequests: 1 });

    expect(screen.getByText("1 طلب انضمام")).toBeTruthy();
  });

  it("counts several waiting teams", () => {
    show({ pendingJoinRequests: 3 });

    expect(screen.getByText("3 طلب انضمام")).toBeTruthy();
  });

  it("says nothing when no team is waiting", () => {
    show();

    expect(screen.queryByText(/طلب انضمام/)).toBeNull();
  });

  it("keeps join requests apart from registrations waiting review", () => {
    show({
      pendingJoinRequests: 1,
      registrations: [
        {
          id: "r1",
          status: "PENDING",
          paymentProof: null,
          rejectionReason: null,
          member: { id: "m1", fullName: "محمد", phone: null, age: "البدريين" },
        },
      ],
    });

    expect(screen.getByText("1 طلب انضمام")).toBeTruthy();
    expect(screen.getByText("1 في الانتظار")).toBeTruthy();
  });
});

describe("what an activity row counts", () => {
  it("counts the people who signed up for a campaign, which used to say nothing", () => {
    show({
      isVolunteer: true,
      isTournament: false,
      registrations: [
        {
          id: "r1",
          status: "ACTIVE",
          paymentProof: null,
          rejectionReason: null,
          member: { id: "m1", fullName: "محمد", phone: null, age: "البدريين" },
        },
      ],
    });

    expect(screen.getByText(/1/)).toBeTruthy();
  });

  it("reads the count against the seats when the activity has a limit", () => {
    show({
      capacity: 24,
      registrations: [
        {
          id: "r1",
          status: "ACTIVE",
          paymentProof: null,
          rejectionReason: null,
          member: { id: "m1", fullName: "محمد", phone: null, age: "البدريين" },
        },
      ],
    });

    expect(screen.getByText("1 من 24")).toBeTruthy();
  });

  it("leaves a rejected registration out of the count", () => {
    show({
      capacity: 10,
      registrations: [
        {
          id: "r1",
          status: "REJECTED",
          paymentProof: null,
          rejectionReason: null,
          member: { id: "m1", fullName: "محمد", phone: null, age: "البدريين" },
        },
      ],
    });

    expect(screen.getByText("0 من 10")).toBeTruthy();
  });
});

describe("the row menu", () => {
  it("offers the tournament workspace on a tournament", async () => {
    show({ isTournament: true });

    await userEvent.click(screen.getByRole("button", { name: /خيارات/ }));

    expect(screen.getByRole("link", { name: /إدارة البطولة/ })).toBeTruthy();
  });

  it("leaves the tournament workspace out of an ordinary activity's menu", async () => {
    show({ isTournament: false });

    await userEvent.click(screen.getByRole("button", { name: /خيارات/ }));

    expect(screen.queryByRole("link", { name: /إدارة البطولة/ })).toBeNull();
    expect(screen.getByRole("button", { name: /نسخ النشاط/ })).toBeTruthy();
  });

  it("keeps the menu shut until it is asked for", () => {
    show({ isTournament: true });

    expect(screen.queryByRole("link", { name: /إدارة البطولة/ })).toBeNull();
  });
});

describe("the controls in the row menu", () => {
  async function openMenu(over: Partial<Activity> = {}) {
    show(over);
    await userEvent.click(screen.getByRole("button", { name: /خيارات/ }));
  }

  it("offers to publish a draft and says it is one", async () => {
    await openMenu({ published: false });

    expect(screen.getByText("مسودة")).toBeTruthy();
    expect(screen.getByRole("button", { name: /نشر النشاط/ })).toBeTruthy();
  });

  it("offers to hide an activity that is already published", async () => {
    await openMenu({ published: true });

    expect(screen.queryByText("مسودة")).toBeNull();
    expect(screen.getByRole("button", { name: /إخفاء من صفحات الأعضاء/ })).toBeTruthy();
  });

  it("publishes on the way out", async () => {
    await openMenu({ published: false });

    await userEvent.click(screen.getByRole("button", { name: /نشر النشاط/ }));

    expect(controls.setPublished).toHaveBeenCalledWith("a1", true);
  });

  it("closes a registration that is open", async () => {
    await openMenu({ isOpen: true });

    await userEvent.click(screen.getByRole("button", { name: /إغلاق التسجيل/ }));

    expect(controls.setOpen).toHaveBeenCalledWith("a1", false);
  });

  it("opens a registration that is closed", async () => {
    await openMenu({ isOpen: false });

    await userEvent.click(screen.getByRole("button", { name: /فتح التسجيل/ }));

    expect(controls.setOpen).toHaveBeenCalledWith("a1", true);
  });

  it("duplicates the activity it belongs to", async () => {
    await openMenu();

    await userEvent.click(screen.getByRole("button", { name: /نسخ النشاط/ }));

    expect(controls.duplicate).toHaveBeenCalledWith("a1");
  });
});
