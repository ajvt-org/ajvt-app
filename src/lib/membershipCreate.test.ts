import { describe, it, expect, vi } from "vitest";
import { addMembership, type NewMembership } from "./membershipCreate";

vi.mock("./membershipRecord", () => ({
  recordMembershipYear: vi.fn(),
  saveMembershipYear: vi.fn(),
}));
vi.mock("./membershipPaymentServer", () => ({ recordMembershipPayment: vi.fn() }));

import { recordMembershipYear, saveMembershipYear } from "./membershipRecord";
import { recordMembershipPayment } from "./membershipPaymentServer";

function fakeDb() {
  const created = { id: "m1", paymentMethod: "بنكيلي", paymentProof: null, membershipYear: 2026 };
  return {
    member: { create: vi.fn().mockResolvedValue(created) },
    user: { update: vi.fn().mockResolvedValue({}) },
  };
}

function input(over: Partial<NewMembership> = {}): NewMembership {
  return {
    userId: "u1",
    paymentMethod: "بنكيلي",
    paymentProof: null,
    paidAmount: 100,
    surplusAnonymous: false,
    status: "PENDING",
    membershipYear: 2026,
    fee: 100,
    recordedBy: "admin",
    ...over,
  };
}

describe("addMembership", () => {
  it("writes the payment onto the account", async () => {
    const db = fakeDb();

    await addMembership(db as never, input());

    expect(db.member.create).toHaveBeenCalledWith({ data: { userId: "u1" } });
    expect(saveMembershipYear).toHaveBeenCalledWith(db, "u1", 2026, {
      status: "PENDING",
      paymentMethod: "بنكيلي",
      paymentProof: null,
    });
    expect(recordMembershipPayment).toHaveBeenCalledWith(db, "m1", 100, 100, false);
  });

  it("saves the year a membership waiting on review belongs to", async () => {
    vi.mocked(saveMembershipYear).mockClear();
    const waiting = fakeDb();

    await addMembership(waiting as never, input({ status: "PENDING" }));

    expect(saveMembershipYear).toHaveBeenCalledWith(waiting, "u1", 2026, {
      status: "PENDING",
      paymentMethod: "بنكيلي",
      paymentProof: null,
    });
  });

  it("records no accepted year while the payment is still under review", async () => {
    vi.mocked(recordMembershipYear).mockClear();
    const db = fakeDb();

    await addMembership(db as never, input({ status: "PENDING" }));

    expect(recordMembershipYear).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("records the year against the account, not the membership row", async () => {
    vi.mocked(recordMembershipYear).mockClear();
    const db = fakeDb();

    await addMembership(db as never, input({ status: "ACTIVE" }));

    expect(recordMembershipYear).toHaveBeenCalledWith(db, "u1", 2026, 100, {
      paymentMethod: "بنكيلي",
      paymentProof: null,
      recordedBy: "admin",
    });
  });

  it("stamps a membership number on the account when one was issued", async () => {
    const db = fakeDb();
    const issued = { memberNumber: "AJVT-2026-0001", verifyToken: "tok" };

    await addMembership(db as never, input({ status: "ACTIVE", issued }));

    expect(db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: issued });
  });

  it("leaves an existing membership number alone", async () => {
    const db = fakeDb();

    await addMembership(db as never, input({ status: "ACTIVE" }));

    expect(db.user.update).not.toHaveBeenCalled();
  });
});
