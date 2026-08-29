import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountPhoneForm from "./AccountPhoneForm";

const patch = vi.fn().mockResolvedValue({});
vi.mock("@/lib/api", () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

afterEach(() => vi.clearAllMocks());

function setup(phone: string | null) {
  const onChanged = vi.fn();
  render(<AccountPhoneForm memberId="m1" phone={phone} onChanged={onChanged} />);
  return { onChanged };
}

describe("AccountPhoneForm", () => {
  it("shows the number and offers to correct it", () => {
    setup("36000001");

    expect(screen.getByText("36000001")).toBeDefined();
    expect(screen.getByRole("button", { name: /تصحيح/ })).toBeDefined();
  });

  it("says there is no number for someone an admin added by hand", () => {
    setup(null);

    expect(screen.getByText("لا يوجد رقم")).toBeDefined();
    expect(screen.getByRole("button", { name: /إضافة رقم/ })).toBeDefined();
  });

  it("opens on an empty box rather than the word null", async () => {
    setup(null);

    await userEvent.click(screen.getByRole("button", { name: /إضافة رقم/ }));

    expect((screen.getByLabelText("رقم الحساب") as HTMLInputElement).value).toBe("");
  });

  it("explains what adding a number gets the person", async () => {
    setup(null);

    await userEvent.click(screen.getByRole("button", { name: /إضافة رقم/ }));

    expect(screen.getByText(/ليتمكن هذا الشخص من الدخول/)).toBeDefined();
  });

  it("saves the typed number", async () => {
    setup(null);

    await userEvent.click(screen.getByRole("button", { name: /إضافة رقم/ }));
    await userEvent.type(screen.getByLabelText("رقم الحساب"), "36000002");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1/account", { phone: "36000002" });
  });
});
