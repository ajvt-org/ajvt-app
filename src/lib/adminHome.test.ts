import { describe, it, expect } from "vitest";
import { membershipStanding, needsHandling, netMoney } from "./adminHome";

const member = (over: Partial<Parameters<typeof membershipStanding>[0][number]> = {}) => ({
  status: "ACTIVE",
  membershipYear: 2026,
  ...over,
});

describe("membershipStanding", () => {
  it("counts an active member on the running year as current", () => {
    expect(membershipStanding([member()], 2026)).toEqual({ current: 1, active: 1, former: 0 });
  });

  it("counts an unrenewed year as former", () => {
    expect(membershipStanding([member({ membershipYear: 2025 })], 2026)).toEqual({
      current: 0,
      active: 1,
      former: 1,
    });
  });

  it("leaves a pending or rejected member out of both figures", () => {
    const rows = [member({ status: "PENDING" }), member({ status: "REJECTED" }), member()];

    expect(membershipStanding(rows, 2026)).toEqual({ current: 1, active: 1, former: 0 });
  });

  it("answers zero for an association with nobody on the books", () => {
    expect(membershipStanding([], 2026)).toEqual({ current: 0, active: 0, former: 0 });
  });
});

describe("needsHandling", () => {
  it("adds up everything waiting on an admin", () => {
    expect(needsHandling({ pendingMembers: 3, pendingRegistrations: 2, pendingPayments: 1 })).toBe(
      6,
    );
  });

  it("is nothing when the desk is clear", () => {
    expect(needsHandling({ pendingMembers: 0, pendingRegistrations: 0, pendingPayments: 0 })).toBe(
      0,
    );
  });
});

describe("netMoney", () => {
  it("takes spending off what came in", () => {
    expect(netMoney(10000, 4000)).toBe(6000);
  });

  it("goes negative when the association spent more than it took", () => {
    expect(netMoney(1000, 2500)).toBe(-1500);
  });
});
