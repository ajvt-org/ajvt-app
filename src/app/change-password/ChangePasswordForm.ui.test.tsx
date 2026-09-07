import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChangePasswordForm from "./ChangePasswordForm";
import { auth } from "@/lib/messages";
import { changePassword as texts } from "@/lib/texts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

describe("the change password form", () => {
  it("offers the fields while the temporary password is live", () => {
    render(<ChangePasswordForm locked />);

    expect(screen.getByText(texts.temporaryNote)).toBeTruthy();
    expect(screen.getByText(texts.save)).toBeTruthy();
  });

  it("says the temporary password has run out and offers no fields", () => {
    render(<ChangePasswordForm locked expired />);

    expect(screen.getByText(auth.tempPasswordExpired)).toBeTruthy();
    expect(screen.queryByText(texts.save)).toBeNull();
    expect(screen.queryByText(texts.temporaryNote)).toBeNull();
  });

  it("leaves the way out on the screen, so nobody is stranded", () => {
    render(<ChangePasswordForm locked expired />);

    expect(screen.getByText(texts.logout)).toBeTruthy();
  });
});
