import { describe, it, expect, vi } from "vitest";
import { addMembership, type NewMembership } from "./membershipCreate";

vi.mock("./membershipRecord", () => ({ saveMembershipYear: vi.fn() }));
vi.mock("./membershipPaymentServer", () => ({ recordMembershipPayment: vi.fn() }));

import { saveMembershipYear } from "./membershipRecord";
import { recordMembershipPayment } from "./membershipPaymentServer";

function fakeDb() {
  return { user: { update: vi.fn().mockResolvedValue({}) } };
}

const ISSUED = { memberNumber: "AJVT-2026-0001", verifyToken: "tok" };

function input(over: Partial<NewMembership> = {}): NewMembership {
  return {
    userId: "u1",
    paymentMethod: "بنكيلي",
    accountId: null,
    paymentProof: null,
    paidAmount: 100,
    surplusAnonymous: false,
    status: "PENDING",
    membershipYear: 2026,
    fee: 100,
    recorder: { name: "admin", adminId: "a1" },
    ...over,
  };
}

describe("addMembership", () => {
  it("writes the year and the payment onto the account", async () => {
    const db = fakeDb();

    await addMembership(db as never, input());

    expect(saveMembershipYear).toHaveBeenCalledWith(db, "u1", 2026, { status: "PENDING" });
    expect(recordMembershipPayment).toHaveBeenCalledWith(db, "u1", 100, 100, {
      method: "بنكيلي",
      accountId: null,
      proof: null,
      status: "PENDING",
      recorder: { name: "admin", adminId: "a1" },
      anonymous: false,
    });
  });

  it("saves the year a membership waiting on review belongs to", async () => {
    vi.mocked(saveMembershipYear).mockClear();
    const waiting = fakeDb();

    await addMembership(waiting as never, input({ status: "PENDING" }));

    expect(saveMembershipYear).toHaveBeenCalledWith(waiting, "u1", 2026, { status: "PENDING" });
  });

  it("issues no membership number while the payment is still under review", async () => {
    const db = fakeDb();

    await addMembership(db as never, input({ status: "PENDING", issued: ISSUED }));

    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("stamps a membership number on the account when one was issued", async () => {
    const db = fakeDb();

    await addMembership(db as never, input({ status: "ACTIVE", issued: ISSUED }));

    expect(db.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: ISSUED });
  });

  it("leaves an existing membership number alone", async () => {
    const db = fakeDb();

    await addMembership(db as never, input({ status: "ACTIVE" }));

    expect(db.user.update).not.toHaveBeenCalled();
  });
});
