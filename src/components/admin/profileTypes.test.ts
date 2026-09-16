import { describe, expect, it } from "vitest";
import { withMembership, type MemberProfile } from "./profileTypes";

function memberOf(over: Partial<MemberProfile["member"]> = {}): MemberProfile["member"] {
  return {
    id: "u1",
    fullName: "محمد ولد أحمد",
    phone: "22334455",
    age: null,
    village: "التاكلالت",
    photo: null,
    photoLocked: false,
    status: "ACTIVE",
    memberNumber: "AJVT-2026-0001",
    paidAmount: null,
    supportAmount: 0,
    paymentMethod: null,
    accountId: null,
    account: null,
    paymentProof: null,
    paymentPaidOn: null,
    paymentRecordedAt: null,
    membershipYear: 2026,
    endedAt: null,
    endedReason: null,
    endedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    user: { id: "u1", phone: "22334455", createdAt: "2026-01-01T00:00:00.000Z" },
    registrations: [],
    teamMemberships: [],
    donations: [],
    ...over,
  };
}

describe("withMembership", () => {
  it("hands back the member once the membership fields are all there", () => {
    const joined = withMembership(memberOf());

    expect(joined).not.toBeNull();
    expect(joined?.membershipYear).toBe(2026);
    expect(joined?.status).toBe("ACTIVE");
  });

  it("refuses an account that never filled the form", () => {
    expect(
      withMembership(
        memberOf({ membershipYear: null, status: null, createdAt: null, memberNumber: null }),
      ),
    ).toBeNull();
  });

  it("refuses a member missing any one of the three fields", () => {
    expect(withMembership(memberOf({ membershipYear: null }))).toBeNull();
    expect(withMembership(memberOf({ status: null }))).toBeNull();
    expect(withMembership(memberOf({ createdAt: null }))).toBeNull();
  });

  it("keeps the person's own fields untouched", () => {
    const joined = withMembership(memberOf({ fullName: "سالم", village: "لبراكنه" }));

    expect(joined?.fullName).toBe("سالم");
    expect(joined?.village).toBe("لبراكنه");
  });
});
