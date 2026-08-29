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
    fullName: "محمد ولد أحمد",
    createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    lastActiveDate: null,
    hasPush: true,
    ...over,
  };
}

function renderSection(
  users: BareAccount[],
  over: Partial<{
    onFill: (person: { id: string; fullName: string }) => void;
    onChanged: () => void;
  }> = {},
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

  it("says today for an account registered today, not zero days", () => {
    renderSection([account({ createdAt: new Date().toISOString() })]);

    expect(screen.getByText(/سجّل اليوم/)).toBeDefined();
  });

  it("hands out a temporary password on reset", async () => {
    post.mockResolvedValue({ tempPassword: "AB12CD", hours: 1 });
    renderSection([account()]);

    fireEvent.click(screen.getByText("إعادة تعيين"));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/admin/reset-password", { userId: "u1" });
      expect(screen.getByText("AB12CD")).toBeDefined();
    });
  });

  it("says there is nothing when every account has a request", () => {
    renderSection([]);

    expect(screen.getByText("لا يوجد أحد بلا اشتراك")).toBeDefined();
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

  it("hands the person over so the payment can be added to them", () => {
    const onFill = vi.fn();
    renderSection([account()], { onFill });

    fireEvent.click(screen.getByText("إضافة طلب"));

    expect(onFill).toHaveBeenCalledWith({ id: "u1", fullName: "محمد ولد أحمد" });
  });

  it("deletes only after the name is typed back", async () => {
    del.mockResolvedValue({ ok: true });
    const onChanged = vi.fn();
    renderSection([account()], { onChanged });

    fireEvent.click(screen.getByText("حذف"));
    fireEvent.click(screen.getByText("متابعة"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "محمد ولد أحمد" } });
    fireEvent.click(screen.getByRole("button", { name: "حذف نهائي" }));

    await waitFor(() => {
      expect(del).toHaveBeenCalledWith("/api/admin/users/u1", { confirmPhone: "محمد ولد أحمد" });
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

describe("someone an admin added without a number", () => {
  it("is listed, named, and marked as unable to sign in", () => {
    renderSection([account({ phone: null, fullName: "سيدي ولد المشرف" })]);

    expect(screen.getByText("سيدي ولد المشرف")).toBeDefined();
    expect(screen.getByText(/لا يملك رقماً للدخول/)).toBeDefined();
  });

  it("is not offered the actions that need a login", () => {
    renderSection([account({ phone: null, fullName: "سيدي ولد المشرف" })]);

    expect(screen.queryByRole("button", { name: /إعادة تعيين/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /إضافة طلب/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /تذكير/ })).toBeNull();
  });

  it("can still be deleted, confirmed by name", async () => {
    del.mockResolvedValueOnce({});
    renderSection([account({ phone: null, fullName: "سيدي ولد المشرف" })]);

    fireEvent.click(screen.getByRole("button", { name: /حذف/ }));
    fireEvent.click(screen.getByRole("button", { name: /متابعة/ }));
    fireEvent.change(screen.getByLabelText("اسم العضو للتأكيد"), {
      target: { value: "سيدي ولد المشرف" },
    });
    fireEvent.click(screen.getByRole("button", { name: /حذف نهائي$/ }));

    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("/api/admin/users/u1", { confirmPhone: "سيدي ولد المشرف" }),
    );
  });
});
