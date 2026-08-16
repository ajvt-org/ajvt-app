import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityRegistrations from "./ActivityRegistrations";
import { ToastProvider } from "./Toast";
import type { Activity, EligibleMember } from "./activityTypes";

const activity: Activity = {
  id: "a1",
  title: "دوري الحي",
  description: "",
  when: null,
  photo: null,
  capacity: null,
  isOpen: true,
  isTournament: false,
  isVolunteer: false,
  whatsappLink: null,
  registrantCount: 0,
  teams: [],
};

const member: EligibleMember = {
  id: "m1",
  fullName: "محمد ولد أحمد",
  photo: null,
  registrations: [],
  teamMemberships: [],
};

function setup(over: { activity?: Partial<Activity>; member?: Partial<EligibleMember> } = {}) {
  const onReload = vi.fn();
  render(
    <ToastProvider>
      <ActivityRegistrations
        activity={{ ...activity, ...over.activity }}
        member={{ ...member, ...over.member }}
        onReload={onReload}
      />
    </ToastProvider>,
  );
  return { onReload };
}

function mockFetch(body: unknown = {}, ok = true) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok, status: ok ? 200 : 400, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ActivityRegistrations", () => {
  it("offers to register when nothing has been sent yet", () => {
    setup();

    expect(screen.getByRole("button", { name: /سجّل/ })).toBeDefined();
  });

  it("registers the membership on the account, naming nobody", async () => {
    const fetchMock = mockFetch();
    const { onReload } = setup();

    await userEvent.click(screen.getByRole("button", { name: /سجّل/ }));

    await waitFor(() => expect(onReload).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/activities/register");
    expect(JSON.parse(init.body)).toEqual({ activityId: "a1", memberId: "m1" });
    expect(screen.queryByText("محمد ولد أحمد")).toBeNull();
  });

  it("shows a pending request with the way to call it off", () => {
    setup({
      member: { registrations: [{ activityId: "a1", status: "PENDING", rejectionReason: null }] },
    });

    expect(screen.getByText("قيد المراجعة")).toBeDefined();
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeDefined();
  });

  it("offers another go after a refusal, with the reason that was given", () => {
    setup({
      member: {
        registrations: [{ activityId: "a1", status: "REJECTED", rejectionReason: "اكتمل العدد" }],
      },
    });

    expect(screen.getByRole("button", { name: /إعادة المحاولة/ })).toBeDefined();
    expect(screen.getByText(/اكتمل العدد/)).toBeDefined();
  });

  it("says registration is closed rather than offering a button", () => {
    setup({ activity: { isOpen: false } });

    expect(screen.getByText("التسجيل مغلق")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says the activity is full once capacity is reached", () => {
    setup({ activity: { capacity: 2, registrantCount: 2 } });

    expect(screen.getByText("اكتمل العدد")).toBeDefined();
  });

  it("lets an approved registrant pick a team in a tournament", async () => {
    const fetchMock = mockFetch();
    setup({
      activity: { isTournament: true, teams: [{ id: "t1", name: "الفريق الأول" }] },
      member: { registrations: [{ activityId: "a1", status: "ACTIVE", rejectionReason: null }] },
    });

    await userEvent.click(screen.getByRole("button", { name: "الفريق الأول" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/teams/t1/join");
  });

  it("locks the team once the admin has confirmed it", () => {
    setup({
      activity: { isTournament: true, teams: [{ id: "t1", name: "الفريق الأول" }] },
      member: {
        registrations: [{ activityId: "a1", status: "ACTIVE", rejectionReason: null }],
        teamMemberships: [
          { teamId: "t1", teamName: "الفريق الأول", activityId: "a1", status: "ACTIVE" },
        ],
      },
    });

    expect(screen.getByText("تم التأكيد — لا يمكن تغييره")).toBeDefined();
    expect(screen.queryByRole("button", { name: "الفريق الأول" })).toBeNull();
  });
});
