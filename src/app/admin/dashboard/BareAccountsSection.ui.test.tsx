import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import BareAccountsSection from "./BareAccountsSection";
import type { BareAccount } from "./types";

const post = vi.fn();
const del = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    post: (...args: unknown[]) => post(...args),
    del: (...args: unknown[]) => del(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function account(over: Partial<BareAccount> = {}): BareAccount {
  return {
    id: "u1",
    phone: "36000001",
    createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    lastActiveDate: null,
    hasPush: true,
    ...over,
  };
}

function renderSection(
  users: BareAccount[],
  over: Partial<{ onFill: (phone: string) => void; onChanged: () => void }> = {},
) {
  cleanup();
  render(
    <BareAccountsSection
      users={users}
      loading={false}
      onFill={over.onFill ?? (() => {})}
      onChanged={over.onChanged ?? (() => {})}
    />,
  );
}

describe("BareAccountsSection", () => {
  beforeEach(() => {
    post.mockReset();
    del.mockReset();
  });

  it("shows the phone and how long the account has waited", () => {
    renderSection([account()]);

    expect(screen.getByText("36000001")).toBeDefined();
    expect(screen.getByText(/سجّل منذ/)).toBeDefined();
  });

  it("says there is nothing when every account has a request", () => {
    renderSection([]);

    expect(screen.getByText("لا توجد حسابات بدون طلب")).toBeDefined();
  });

  it("nudges over push and reports the send", async () => {
    post.mockResolvedValue({ reached: 1 });
    renderSection([account()]);

    fireEvent.click(screen.getByText("تذكير"));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/admin/waiting/chase", {
        userId: "u1",
        kind: "unfinished",
      });
      expect(screen.getByText(/أُرسل|تم/)).toBeDefined();
    });
  });

  it("offers no nudge to an account that cannot receive push", () => {
    renderSection([account({ hasPush: false })]);

    expect(screen.queryByText("تذكير")).toBeNull();
  });

  it("hands the phone over to prefill the manual add", () => {
    const onFill = vi.fn();
    renderSection([account()], { onFill });

    fireEvent.click(screen.getByText("إضافة طلب"));

    expect(onFill).toHaveBeenCalledWith("36000001");
  });

  it("deletes only after the phone is typed back", async () => {
    del.mockResolvedValue({ ok: true });
    const onChanged = vi.fn();
    renderSection([account()], { onChanged });

    fireEvent.click(screen.getByText("حذف"));
    fireEvent.click(screen.getByText("متابعة"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "36000001" } });
    fireEvent.click(screen.getByRole("button", { name: "حذف نهائي" }));

    await waitFor(() => {
      expect(del).toHaveBeenCalledWith("/api/admin/users/u1", { confirmPhone: "36000001" });
      expect(onChanged).toHaveBeenCalled();
    });
  });

  it("keeps the delete button disabled while the typed phone is wrong", () => {
    renderSection([account()]);

    fireEvent.click(screen.getByText("حذف"));
    fireEvent.click(screen.getByText("متابعة"));
    const confirm = screen.getByRole("button", { name: "حذف نهائي" }) as HTMLButtonElement;

    expect(confirm.disabled).toBe(true);
  });
});
