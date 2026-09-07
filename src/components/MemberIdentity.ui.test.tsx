import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MemberIdentity from "./MemberIdentity";
import { STATUS } from "@/lib/memberStatus";
import type { MemberData } from "@/lib/useMember";

vi.mock("@/components/PhotoUpload", () => ({
  default: () => <div data-testid="photo-upload" />,
}));

const NUMBER = "AJVT-2026-0007";

function member(overrides: Partial<MemberData> = {}): MemberData {
  return {
    id: "m1",
    fullName: "سالم ولد المختار",
    status: "ACTIVE",
    memberNumber: NUMBER,
    photo: null,
    photoLocked: false,
    ...overrides,
  } as MemberData;
}

function show(overrides: Partial<MemberData> = {}) {
  const bound: HTMLElement[] = [];
  render(
    <MemberIdentity
      member={member(overrides)}
      onPhotoUpdated={() => {}}
      nameRef={(el) => {
        if (el) bound.push(el);
      }}
    />,
  );
  return bound;
}

describe("MemberIdentity", () => {
  it("leaves the member number to the card and does not repeat it under the name", () => {
    show();

    expect(screen.queryByText(NUMBER)).toBeNull();
  });

  it("still binds the name element the header bar reads", () => {
    const bound = show();

    expect(bound).toHaveLength(1);
    expect(bound[0].textContent).toBe("سالم ولد المختار");
  });

  it("keeps the standing badge, which is what a member waiting on a decision came for", () => {
    show({ status: "PENDING", memberNumber: null });

    expect(screen.getByText(STATUS.PENDING.label)).toBeDefined();
    expect(screen.getByText("سالم ولد المختار")).toBeDefined();
  });
});
