import { describe, it, expect } from "vitest";
import { canRenew, renewalRefusal, yearsOwed, type RenewableMember } from "@/lib/renewal";

function member(over: Partial<RenewableMember> = {}): RenewableMember {
  return { status: "ACTIVE", membershipYear: 2025, memberNumber: "AJVT-2025-0001", ...over };
}

describe("who can be renewed", () => {
  it("takes an accepted member whose year has passed", () => {
    expect(canRenew(member(), 2026)).toBe(true);
    expect(renewalRefusal(member(), 2026)).toBeNull();
  });

  it("refuses a member who is not accepted, since there is nothing to renew", () => {
    expect(renewalRefusal(member({ status: "PENDING" }), 2026)).toBe("notActive");
    expect(renewalRefusal(member({ status: "REJECTED" }), 2026)).toBe("notActive");
  });

  it("refuses a member with no number, since a renewal is meant to keep one", () => {
    expect(renewalRefusal(member({ memberNumber: null }), 2026)).toBe("notIssued");
  });

  it("refuses a second renewal for the same year", () => {
    expect(renewalRefusal(member({ membershipYear: 2026 }), 2026)).toBe("alreadyRenewed");
  });

  it("refuses a member already ahead of the running year", () => {
    expect(renewalRefusal(member({ membershipYear: 2027 }), 2026)).toBe("yearBehind");
  });
});

describe("how far behind a member is", () => {
  it("counts the years between their membership and the running one", () => {
    expect(yearsOwed(member({ membershipYear: 2024 }), 2026)).toBe(2);
    expect(yearsOwed(member({ membershipYear: 2025 }), 2026)).toBe(1);
  });

  it("owes nothing when they are up to date or ahead", () => {
    expect(yearsOwed(member({ membershipYear: 2026 }), 2026)).toBe(0);
    expect(yearsOwed(member({ membershipYear: 2027 }), 2026)).toBe(0);
  });
});
