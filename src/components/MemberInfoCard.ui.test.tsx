import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MemberInfoCard from "./MemberInfoCard";
import { HOME_VILLAGE } from "@/lib/villages";
import { myProfile, paidAmount, villageField } from "@/lib/texts";
import type { MemberData } from "@/lib/useMember";

const texts = myProfile.details;
const AGE = "البدريين";

function member(overrides: Partial<MemberData> = {}): MemberData {
  return {
    id: "m1",
    fullName: "سالم ولد المختار",
    user: { phone: "22200000" },
    village: HOME_VILLAGE,
    age: AGE,
    status: "ACTIVE",
    memberNumber: "AJVT-2026-0007",
    paymentMethod: "بنكيلي",
    paidAmount: 500,
    supportAmount: 200,
    createdAt: "2026-08-11T09:00:00.000Z",
    updatedAt: "2026-08-13T09:00:00.000Z",
    ...overrides,
  } as MemberData;
}

const waiting = () => member({ status: "PENDING", memberNumber: null });

describe("MemberInfoCard", () => {
  it("never prints the minute a request was sent", () => {
    const { container, unmount } = render(<MemberInfoCard member={waiting()} />);
    expect(container.textContent).not.toMatch(/\d{2}:\d{2}/);
    unmount();

    const second = render(<MemberInfoCard member={member()} onCard />);
    expect(second.container.textContent).not.toMatch(/\d{2}:\d{2}/);
  });

  it("leaves the money to the receipt once the membership is granted", () => {
    render(<MemberInfoCard member={member()} onCard />);

    expect(screen.queryByText(texts.paymentMethod)).toBeNull();
    expect(screen.queryByText(paidAmount.fee)).toBeNull();
    expect(screen.queryByText(paidAmount.support)).toBeNull();
    expect(screen.queryByText(paidAmount.total)).toBeNull();
  });

  it("shows the payment while it is still waiting on a decision and has no receipt", () => {
    render(<MemberInfoCard member={waiting()} />);

    expect(screen.getByText(texts.paymentMethod)).toBeDefined();
    expect(screen.getByText(paidAmount.fee)).toBeDefined();
    expect(screen.getByText(paidAmount.support)).toBeDefined();
    expect(screen.getByText(texts.requestedOn)).toBeDefined();
  });

  it("drops the village and the age while the card beside it carries them", () => {
    render(<MemberInfoCard member={member()} onCard />);

    expect(screen.queryByText(villageField.label)).toBeNull();
    expect(screen.queryByText(texts.age)).toBeNull();
  });

  it("keeps the village and the age for a member with no card to read them from", () => {
    render(<MemberInfoCard member={waiting()} />);

    expect(screen.getByText(villageField.label)).toBeDefined();
    expect(screen.getByText(HOME_VILLAGE)).toBeDefined();
    expect(screen.getByText(texts.age)).toBeDefined();
    expect(screen.getByText(AGE)).toBeDefined();
  });

  it("keeps the phone whatever else moves, since nothing else on the page shows it", () => {
    render(<MemberInfoCard member={member()} onCard />);

    expect(screen.getByText(texts.phone)).toBeDefined();
    expect(screen.getByText("22200000")).toBeDefined();
  });

  it("offers the payment edit only when there is one still to settle", () => {
    const { unmount } = render(<MemberInfoCard member={member()} onCard />);
    expect(screen.queryByText(texts.edit)).toBeNull();
    unmount();

    render(<MemberInfoCard member={waiting()} onEdit={() => {}} />);
    expect(screen.getByText(texts.edit)).toBeDefined();
  });
});
