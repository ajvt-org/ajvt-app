import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MembershipStanding from "./MembershipStanding";
import type { MemberData } from "@/lib/useMember";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const YEAR = 2026;

function member(overrides: Partial<MemberData> = {}): MemberData {
  return {
    id: "m1",
    status: "ACTIVE",
    membershipYear: YEAR,
    rejectionReason: null,
    ...overrides,
  } as MemberData;
}

describe("MembershipStanding", () => {
  it("asks an account with no payment for one, and points at the payment form", () => {
    render(<MembershipStanding member={null} currentYear={YEAR} />);

    expect(screen.getByText("لم ترسل اشتراكك بعد")).toBeDefined();
    expect(screen.getByRole("link", { name: /إرسال الاشتراك/ }).getAttribute("href")).toBe(
      "/membership",
    );
  });

  it("never sends an account holder back to register, they already have one", () => {
    render(<MembershipStanding member={null} currentYear={YEAR} />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("/register");
    }
  });

  it("says a payment is under review, with nothing to do", () => {
    render(<MembershipStanding member={member({ status: "PENDING" })} currentYear={YEAR} />);

    expect(screen.getByText("دفعك قيد المراجعة")).toBeDefined();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("carries the refusal reason and a way back to the same payment", () => {
    render(
      <MembershipStanding
        member={member({ status: "REJECTED", rejectionReason: "الصورة غير واضحة" })}
        currentYear={YEAR}
      />,
    );

    expect(screen.getByText(/الصورة غير واضحة/)).toBeDefined();
    expect(screen.getByRole("link", { name: /أعد إرسال الدفع/ }).getAttribute("href")).toBe(
      "/membership?id=m1",
    );
  });

  it("says nothing at all to a member who is paid up", () => {
    const { container } = render(<MembershipStanding member={member()} currentYear={YEAR} />);

    expect(container.firstChild).toBeNull();
  });

  it("names both years for a member who is behind", () => {
    render(<MembershipStanding member={member({ membershipYear: 2024 })} currentYear={YEAR} />);

    expect(screen.getByText(/2024/)).toBeDefined();
    expect(screen.getByText(/2026/)).toBeDefined();
  });

  it("holds its tongue until it knows the year being collected", () => {
    const { container } = render(<MembershipStanding member={null} currentYear={null} />);

    expect(container.firstChild).toBeNull();
  });
});
