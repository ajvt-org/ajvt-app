import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import DisciplineTab from "./DisciplineTab";
import type { Suspension, Team } from "./types";

const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    del: (...args: unknown[]) => del(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const TEAM: Team = {
  id: "t1",
  name: "الصقور",
  autoNamed: false,
  fromHomeVillage: true,
  logo: null,
  captainUserId: null,
  groupId: null,
  group: null,
  members: [
    {
      status: "ACTIVE",
      member: {
        id: "p1",
        fullName: "سالم",
        phone: "36000001",
        age: "البدريين",
        village: "التاكلالت",
        photo: null,
      },
    },
  ],
};

function suspension(over: Partial<Suspension>): Suspension {
  return {
    id: "s1",
    reason: "RED_CARD",
    scope: "MATCHES",
    matches: 1,
    until: null,
    note: null,
    status: "PROPOSED",
    createdBy: "النظام",
    decidedBy: null,
    createdAt: "2026-08-23T12:00:00.000Z",
    running: false,
    member: { id: "p1", fullName: "سالم", photo: null },
    ...over,
  };
}

const onChange = vi.fn();

function show(suspensions: Suspension[]) {
  cleanup();
  render(
    <DisciplineTab
      activityId="a1"
      teams={[TEAM]}
      suspensions={suspensions}
      rules={{ yellowsForBan: 2, redBanMatches: 1 }}
      onChange={onChange}
    />,
  );
}

beforeEach(() => {
  post.mockReset().mockResolvedValue({});
  patch.mockReset().mockResolvedValue({});
  del.mockReset().mockResolvedValue({});
  onChange.mockReset();
});

describe("DisciplineTab", () => {
  it("approves a system proposal", async () => {
    show([suspension({})]);

    expect(screen.getByText("اقتراح النظام")).toBeDefined();
    expect(screen.getByText("بطاقة حمراء")).toBeDefined();
    fireEvent.click(screen.getByText("اعتماد"));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][0]).toBe("/api/admin/activities/a1/suspensions/s1");
    expect(patch.mock.calls[0][1]).toEqual({ approve: true });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it("lifts an active ban", async () => {
    show([suspension({ status: "ACTIVE", running: true })]);

    fireEvent.click(screen.getByText("إلغاء الإيقاف"));

    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("/api/admin/activities/a1/suspensions/s1"),
    );
  });

  it("proposes a manual suspension for a rostered player", async () => {
    show([]);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p1" } });
    fireEvent.click(screen.getByText("نهائي"));
    fireEvent.click(screen.getByText("اقتراح الإيقاف"));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1]).toMatchObject({ userId: "p1", scope: "INDEFINITE" });
  });

  it("saves the tournament's card rules", async () => {
    show([]);

    fireEvent.click(screen.getByText("حفظ القواعد"));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][0]).toBe("/api/admin/activities/a1");
    expect(patch.mock.calls[0][1]).toEqual({ yellowsForBan: 2, redBanMatches: 1 });
  });

  it("marks an active ban whose date has passed", () => {
    show([
      suspension({
        status: "ACTIVE",
        scope: "DAYS",
        matches: null,
        until: "2026-01-01T00:00:00.000Z",
        running: false,
      }),
    ]);

    expect(screen.getByText("انتهت المدة")).toBeDefined();
  });
});
