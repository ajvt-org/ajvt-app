import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemberAccountCard from "./MemberAccountCard";
import { accountPhone, memberAccount as texts } from "@/lib/texts";

const patch = vi.fn().mockResolvedValue({ tempPassword: "AB12CD", tempPasswordHours: 48 });
const post = vi.fn().mockResolvedValue({ tempPassword: "EF34GH", hours: 24 });

vi.mock("@/lib/api", () => ({
  api: {
    patch: (...args: unknown[]) => patch(...args),
    post: (...args: unknown[]) => post(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function show(userId: string | null, phone: string | null = null) {
  const onChanged = vi.fn();
  render(<MemberAccountCard memberId="m1" userId={userId} phone={phone} onChanged={onChanged} />);
  return onChanged;
}

describe("a member an admin added by hand", () => {
  it("is offered an account rather than a correction", () => {
    show(null);

    expect(screen.getByText(texts.none)).toBeDefined();
    expect(screen.getByLabelText(texts.phoneLabel)).toBeDefined();
    expect(screen.queryByRole("button", { name: texts.reset })).toBeNull();
  });

  it("will not take an empty number", () => {
    show(null);

    expect(screen.getByRole("button", { name: texts.create }).hasAttribute("disabled")).toBe(true);
  });

  it("hands back the password the new account starts on", async () => {
    const onChanged = show(null);

    await userEvent.type(screen.getByLabelText(texts.phoneLabel), "36000001");
    await userEvent.click(screen.getByRole("button", { name: texts.create }));

    expect(patch).toHaveBeenCalledWith("/api/admin/members/m1", { accountPhone: "36000001" });
    expect(await screen.findByText("AB12CD")).toBeDefined();
    expect(onChanged).toHaveBeenCalled();
  });
});

describe("a member who already has an account", () => {
  it("keeps the number correction and adds the password reset", () => {
    show("u1", "36000001");

    expect(screen.getByText("36000001")).toBeDefined();
    expect(screen.getByRole("button", { name: texts.reset })).toBeDefined();
    expect(screen.queryByLabelText(texts.phoneLabel)).toBeNull();
  });

  it("shows the temporary password and how long it lasts", async () => {
    show("u1", "36000001");

    await userEvent.click(screen.getByRole("button", { name: texts.reset }));

    expect(post).toHaveBeenCalledWith("/api/admin/reset-password", { userId: "u1" });
    expect(await screen.findByText("EF34GH")).toBeDefined();
  });

  it("still offers to add a number to an account that has none", () => {
    show("u1", null);

    expect(screen.getByText(accountPhone.none)).toBeDefined();
    expect(screen.getByRole("button", { name: texts.reset })).toBeDefined();
  });
});
