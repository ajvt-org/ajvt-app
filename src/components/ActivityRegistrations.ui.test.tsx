import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityRegistrations from "./ActivityRegistrations";
import { ToastProvider } from "./Toast";
import type { Activity, EligibleMember } from "./activityTypes";
import { activityRegistration } from "@/lib/texts";

const activity: Activity = {
  id: "a1",
  title: "دوري الحي",
  description: "",
  when: null,
  startsAt: null,
  endsAt: null,
  photo: null,
  capacity: null,
  isOpen: true,
  isTournament: false,
  isVolunteer: false,
  whatsappLink: null,
  registrantCount: 0,
  joinableTeams: [],
  playersBuildTeams: false,
};

const member: EligibleMember = {
  id: "m1",
  fullName: "محمد ولد أحمد",
  photo: null,
  canJoinNew: true,
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
    expect(JSON.parse(init.body)).toEqual({
      activityId: "a1",
      userId: "m1",
      chosenTeamId: null,
    });
    expect(screen.queryByText("محمد ولد أحمد")).toBeNull();
  });

  it("shows a pending request with the way to call it off", () => {
    setup({
      member: {
        registrations: [
          { activityId: "a1", status: "PENDING", rejectionReason: null, chosenTeamId: null },
        ],
      },
    });

    expect(screen.getByText("قيد المراجعة")).toBeDefined();
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeDefined();
  });

  it("offers another go after a refusal, with the reason that was given", () => {
    setup({
      member: {
        registrations: [
          {
            activityId: "a1",
            status: "REJECTED",
            rejectionReason: "اكتمل العدد",
            chosenTeamId: null,
          },
        ],
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

  it("hands an approved registrant the team block once the switch is on", async () => {
    mockFetch({
      team: null,
      request: null,
      invitations: [],
      candidates: [],
      squad: { min: 2, max: 3 },
    });
    setup({
      activity: {
        isTournament: true,
        playersBuildTeams: true,
        joinableTeams: [{ id: "t1", name: "الفريق الأول" }],
      },
      member: {
        registrations: [
          { activityId: "a1", status: "ACTIVE", rejectionReason: null, chosenTeamId: null },
        ],
      },
    });

    await waitFor(() => expect(screen.getByLabelText(/أنشئ فريقك/)).toBeDefined());
  });

  it("offers no team block on a tournament the admin arranges", () => {
    setup({
      activity: { isTournament: true, joinableTeams: [{ id: "t1", name: "الفريق الأول" }] },
      member: {
        registrations: [
          { activityId: "a1", status: "ACTIVE", rejectionReason: null, chosenTeamId: null },
        ],
      },
    });

    expect(screen.queryByRole("button", { name: "الفريق الأول" })).toBeNull();
    expect(screen.queryByLabelText(/أنشئ فريقك/)).toBeNull();
  });
});

describe("a membership a year behind", () => {
  it("is told to renew instead of being offered the activity", () => {
    render(
      <ActivityRegistrations
        member={{ ...member, canJoinNew: false }}
        activity={activity}
        onReload={() => {}}
      />,
    );

    expect(screen.getByText(/جدّد اشتراكك/)).toBeDefined();
    expect(screen.queryByRole("button", { name: /التسجيل|تسجيل/ })).toBeNull();
  });

  it("still shows what it already joined, and can still cancel a pending one", () => {
    render(
      <ActivityRegistrations
        member={{
          ...member,
          canJoinNew: false,
          registrations: [
            {
              activityId: activity.id,
              status: "PENDING",
              rejectionReason: null,
              chosenTeamId: null,
            },
          ],
        }}
        activity={activity}
        onReload={() => {}}
      />,
    );

    expect(screen.queryByText(/جدّد اشتراكك/)).toBeNull();
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeDefined();
  });
});

describe("picking a team while registering", () => {
  const tournament = {
    isTournament: true,
    joinableTeams: [
      { id: "t1", name: "الصقور" },
      { id: "t2", name: "النسور" },
    ],
  };

  it("offers the tournament's teams with a way to say not yet", () => {
    setup({ activity: tournament });

    const picker = screen.getByLabelText(/اختر فريقك/);
    const options = [...picker.querySelectorAll("option")].map((o) => o.textContent);

    expect(options).toEqual(["بلا فريق بعد", "الصقور", "النسور"]);
  });

  it("sends the team the member picked", async () => {
    const fetchMock = mockFetch();
    setup({ activity: tournament });

    await userEvent.selectOptions(screen.getByLabelText(/اختر فريقك/), "t2");
    await userEvent.click(screen.getByRole("button", { name: /سجّل/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ chosenTeamId: "t2" });
  });

  it("sends no team when the member says not yet", async () => {
    const fetchMock = mockFetch();
    setup({ activity: tournament });

    await userEvent.click(screen.getByRole("button", { name: /سجّل/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ chosenTeamId: null });
  });

  it("asks nothing of an activity that is not a tournament", () => {
    setup();

    expect(screen.queryByLabelText(/اختر فريقك/)).toBeNull();
  });

  it("asks nothing when the tournament has no teams yet", () => {
    setup({ activity: { isTournament: true, joinableTeams: [] } });

    expect(screen.queryByLabelText(/اختر فريقك/)).toBeNull();
  });

  it("says nothing about teams to a singles entrant who is already approved", () => {
    setup({
      activity: { isTournament: true, joinableTeams: [] },
      member: {
        registrations: [
          { activityId: "a1", status: "ACTIVE", rejectionReason: null, chosenTeamId: null },
        ],
        teamMemberships: [
          { teamId: "t1", teamName: "محمد ولد أحمد", activityId: "a1", status: "ACTIVE" },
        ],
      },
    });

    expect(screen.queryByText(/فريقك/)).toBeNull();
    expect(screen.queryByText("تم التأكيد — لا يمكن تغييره")).toBeNull();
  });
});

describe("choosing a team while registering", () => {
  const tournament = {
    isTournament: true,
    joinableTeams: [
      { id: "t1", name: "فريق النجم" },
      { id: "t2", name: "فريق الوحدة" },
    ],
  };

  it("asks the question through a label tied to the picker", () => {
    setup({ activity: tournament });

    const picker = screen.getByLabelText(activityRegistration.chooseTeamAtRegistration);

    expect(picker.tagName).toBe("SELECT");
  });

  it("keeps having no team yet as an answer the member may pick", () => {
    setup({ activity: tournament });

    const none = screen.getByRole("option", {
      name: activityRegistration.noTeamYet,
    }) as HTMLOptionElement;

    expect(none.disabled).toBe(false);
    expect(none.value).toBe("");
  });

  it("tells a member who picked a team that they join it once accepted", () => {
    setup({
      activity: tournament,
      member: {
        registrations: [
          { activityId: "a1", status: "PENDING", rejectionReason: null, chosenTeamId: "t1" },
        ],
      },
    });

    expect(screen.getByText(activityRegistration.chosenTeamPending("فريق النجم"))).toBeTruthy();
  });

  it("says nothing about a team to a member who picked none", () => {
    setup({
      activity: tournament,
      member: {
        registrations: [
          { activityId: "a1", status: "PENDING", rejectionReason: null, chosenTeamId: null },
        ],
      },
    });

    expect(screen.queryByText(/تنضم إليه/)).toBeNull();
  });

  it("offers no picker on an activity that is not a tournament", () => {
    setup();

    expect(screen.queryByLabelText(activityRegistration.chooseTeamAtRegistration)).toBeNull();
    expect(screen.getByRole("button", { name: activityRegistration.register })).toBeTruthy();
  });
});
