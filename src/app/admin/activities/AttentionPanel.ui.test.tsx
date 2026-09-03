import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttentionPanel from "./AttentionPanel";
import type { AttentionRow } from "@/lib/activityAttention";

const patch = vi.fn();
const del = vi.fn();
const reload = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    patch: (...a: unknown[]) => patch(...a),
    del: (...a: unknown[]) => del(...a),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("@/components/Toast", () => ({ useToast: () => vi.fn() }));

function join(over: Partial<AttentionRow> = {}): AttentionRow {
  return {
    id: "join:1",
    kind: "join",
    activityId: "a1",
    activityTitle: "كأس رابطة شباب التاكلالت",
    who: "محمد — الشناقطة",
    since: "2026-08-20T00:00:00.000Z",
    settle: { target: "teamMember", teamId: "t1", userId: "u1" },
    ...over,
  };
}

function registration(over: Partial<AttentionRow> = {}): AttentionRow {
  return join({
    id: "registration:1",
    kind: "registration",
    who: "أحمد",
    settle: { target: "registration", registrationId: "r1" },
    ...over,
  });
}

function suspension(over: Partial<AttentionRow> = {}): AttentionRow {
  return join({ id: "suspension:1", kind: "suspension", who: "سالم", settle: null, ...over });
}

function show(rows: AttentionRow[], newestFirst = false, onOrderChange = vi.fn()) {
  render(
    <AttentionPanel
      rows={rows}
      newestFirst={newestFirst}
      onOrderChange={onOrderChange}
      reload={reload}
    />,
  );
  return onOrderChange;
}

beforeEach(() => {
  vi.clearAllMocks();
  patch.mockResolvedValue({});
  del.mockResolvedValue({});
  reload.mockResolvedValue(undefined);
});

describe("the panel of what needs the admin", () => {
  it("is absent when nothing is waiting", () => {
    const { container } = render(
      <AttentionPanel rows={[]} newestFirst={false} onOrderChange={vi.fn()} reload={reload} />,
    );

    expect(container.textContent).toBe("");
  });

  it("counts each kind of waiting work on its own", () => {
    show([join(), join({ id: "join:2" }), registration()]);

    expect(screen.getByText("طلب انضمام إلى فريق (2)")).toBeTruthy();
    expect(screen.getByText("طلب تسجيل في نشاط (1)")).toBeTruthy();
  });

  it("counts everything waiting in the heading", () => {
    show([join(), registration(), suspension()]);

    expect(screen.getByText(/يحتاج انتباهك \(3\)/)).toBeTruthy();
  });

  it("accepts a join request without leaving the page", async () => {
    show([join()]);

    await userEvent.click(screen.getByRole("button", { name: "قبول محمد — الشناقطة" }));

    expect(patch).toHaveBeenCalledWith("/api/admin/teams/t1/members/u1", {});
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it("refuses a join request by removing it from the team", async () => {
    show([join()]);

    await userEvent.click(screen.getByRole("button", { name: "رفض محمد — الشناقطة" }));

    expect(del).toHaveBeenCalledWith("/api/admin/teams/t1/members/u1");
  });

  it("accepts a pending registration on the activity it belongs to", async () => {
    show([registration()]);

    await userEvent.click(screen.getByRole("button", { name: "قبول أحمد" }));

    expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1/register", {
      registrationId: "r1",
      status: "ACTIVE",
    });
  });

  it("refuses a pending registration", async () => {
    show([registration()]);

    await userEvent.click(screen.getByRole("button", { name: "رفض أحمد" }));

    expect(patch).toHaveBeenCalledWith("/api/admin/activities/a1/register", {
      registrationId: "r1",
      status: "REJECTED",
    });
  });

  it("keeps the link for a decision that needs the other screen", () => {
    show([suspension()]);

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/admin/activities/a1?tab=discipline",
    );
    expect(screen.queryByRole("button", { name: /قبول/ })).toBeNull();
  });

  it("offers both orders rather than a label that flips", async () => {
    const onOrderChange = show([join(), registration()]);

    expect(screen.getByRole("button", { name: "الأقدم أولاً" }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "الأحدث أولاً" }));

    expect(onOrderChange).toHaveBeenCalledWith(true);
  });

  it("reads newest first when asked to", () => {
    show(
      [
        registration({ id: "old", who: "القديم", since: "2026-01-01T00:00:00.000Z" }),
        registration({ id: "new", who: "الجديد", since: "2026-08-28T00:00:00.000Z" }),
      ],
      true,
    );

    expect(screen.getAllByText(/القديم|الجديد/)[0].textContent).toBe("الجديد");
  });

  it("folds away when the heading is clicked", async () => {
    show([join()]);

    await userEvent.click(screen.getByRole("button", { name: /يحتاج انتباهك/ }));

    expect(screen.queryByText("كأس رابطة شباب التاكلالت")).toBeNull();
  });

  it("takes one decision at a time", async () => {
    let settle: (v: unknown) => void = () => {};
    patch.mockReturnValue(new Promise((resolve) => (settle = resolve)));
    show([join(), join({ id: "join:2", who: "عثمان — الفتح" })]);

    await userEvent.click(screen.getByRole("button", { name: "قبول محمد — الشناقطة" }));
    await userEvent.click(screen.getByRole("button", { name: "قبول عثمان — الفتح" }));

    expect(patch).toHaveBeenCalledTimes(1);
    settle({});
  });
});
