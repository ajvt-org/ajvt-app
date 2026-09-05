import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./paymentReceiptServer", () => ({
  ensureReceiptsFor: vi.fn(async () => []),
  syncReceiptsFor: vi.fn(async () => []),
  withdrawReceiptsBeforeDelete: vi.fn(async () => 0),
}));

import {
  donationMirrorOf,
  isPaidAmount,
  mirrorDonation,
  mirrorMembershipPayment,
  mirrorMembershipStatus,
  removeMirroredDonation,
  stampRecordedBy,
  type MirroredDonation,
} from "./paymentMirror";
import {
  ensureReceiptsFor,
  syncReceiptsFor,
  withdrawReceiptsBeforeDelete,
} from "./paymentReceiptServer";

type Call = { op: string; args: Record<string, unknown> };

function fakeDb(existing: { id: string } | null = null) {
  const calls: Call[] = [];
  const record =
    (op: string) =>
    async (args: Record<string, unknown> = {}) => {
      calls.push({ op, args });
      return { id: "made" };
    };
  const db = {
    payment: {
      findFirst: vi.fn(async (args: Record<string, unknown>) => {
        calls.push({ op: "findFirst", args });
        return existing;
      }),
      findUnique: vi.fn(async (args: Record<string, unknown>) => {
        calls.push({ op: "findUnique", args });
        return existing;
      }),
      create: vi.fn(record("create")),
      update: vi.fn(record("update")),
      delete: vi.fn(record("delete")),
      deleteMany: vi.fn(record("deleteMany")),
      updateMany: vi.fn(record("updateMany")),
    },
  };
  return { db: db as never, calls };
}

const GIFT: MirroredDonation = {
  id: "d1",
  amount: 5000,
  anonymous: false,
  paymentMethod: "بنكيلي",
  accountId: null,
  bankReference: null,
  proof: null,
  status: "ACTIVE",
  donorName: "أحمد",
  donorPhoto: null,
  donorPhone: null,
  userId: null,
  activityId: null,
  competitionId: null,
};

const only = (calls: Call[], op: string) => calls.filter((c) => c.op === op);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("what counts as an amount paid", () => {
  it("takes a positive amount and nothing else", () => {
    expect(isPaidAmount(5000)).toBe(true);
    expect(isPaidAmount(1)).toBe(true);
    expect(isPaidAmount(0)).toBe(false);
    expect(isPaidAmount(-1)).toBe(false);
    expect(isPaidAmount(null)).toBe(false);
  });
});

describe("the payment a donation is mirrored into", () => {
  it("carries the activity a gift is aimed at", () => {
    expect(donationMirrorOf({ ...GIFT, activityId: "a1" })).toMatchObject({
      activityId: "a1",
      competitionId: null,
    });
  });

  it("carries the competition a gift is aimed at", () => {
    expect(donationMirrorOf({ ...GIFT, competitionId: "c1" })).toMatchObject({
      activityId: null,
      competitionId: "c1",
    });
  });

  it("carries the tags only when the caller says which they are", () => {
    expect(donationMirrorOf(GIFT).tagIds).toBeUndefined();
    expect(donationMirrorOf(GIFT, ["t1"]).tagIds).toEqual(["t1"]);
  });

  it("renames the method, since a donation and a payment call it different things", () => {
    expect(donationMirrorOf(GIFT).method).toBe("بنكيلي");
  });
});

describe("writing the mirrored payment", () => {
  it("counts a gift aimed nowhere as a plain donation", async () => {
    const { db, calls } = fakeDb();

    await mirrorDonation(db, donationMirrorOf(GIFT));

    expect(only(calls, "create")[0].args.data).toMatchObject({ purpose: "DONATION" });
  });

  it("counts a gift aimed at an activity as activity money", async () => {
    const { db, calls } = fakeDb();

    await mirrorDonation(db, donationMirrorOf({ ...GIFT, activityId: "a1" }));

    expect(only(calls, "create")[0].args.data).toMatchObject({
      purpose: "ACTIVITY",
      activityId: "a1",
      competitionId: null,
    });
  });

  it("counts a gift aimed at a quiz as activity money too, under the quiz", async () => {
    const { db, calls } = fakeDb();

    await mirrorDonation(db, donationMirrorOf({ ...GIFT, competitionId: "c1" }));

    expect(only(calls, "create")[0].args.data).toMatchObject({
      purpose: "ACTIVITY",
      activityId: null,
      competitionId: "c1",
    });
  });

  it("gives the payment the donation's own id, so the two stay one record", async () => {
    const { db, calls } = fakeDb();

    await mirrorDonation(db, donationMirrorOf(GIFT));

    expect(only(calls, "create")[0].args.data).toMatchObject({ id: "d1" });
    expect(ensureReceiptsFor).toHaveBeenCalled();
  });

  it("updates the payment already standing rather than making a second one", async () => {
    const { db, calls } = fakeDb({ id: "d1" });

    await mirrorDonation(db, donationMirrorOf({ ...GIFT, competitionId: "c1" }, ["t1"]));

    expect(only(calls, "create")).toHaveLength(0);
    expect(only(calls, "update")[0].args.data).toMatchObject({ competitionId: "c1" });
    expect(syncReceiptsFor).toHaveBeenCalled();
  });

  it("takes the payment away when the gift loses its amount or is worth nothing", async () => {
    for (const amount of [null, 0, -1]) {
      const { db, calls } = fakeDb({ id: "d1" });

      await mirrorDonation(db, donationMirrorOf({ ...GIFT, amount }));

      expect(only(calls, "delete")).toHaveLength(1);
      expect(only(calls, "create")).toHaveLength(0);
      expect(withdrawReceiptsBeforeDelete).toHaveBeenCalledWith(db, { id: "d1" });
    }
  });

  it("has nothing to take away when a gift with no amount was never mirrored", async () => {
    const { db, calls } = fakeDb();

    await mirrorDonation(db, donationMirrorOf({ ...GIFT, amount: null }));

    expect(calls.filter((c) => c.op !== "findUnique")).toHaveLength(0);
  });

  it("looks the mirrored payment up by its primary key", async () => {
    const { db, calls } = fakeDb();

    await mirrorDonation(db, donationMirrorOf(GIFT));

    expect(only(calls, "findUnique")[0].args).toMatchObject({ where: { id: "d1" } });
    expect(only(calls, "findFirst")).toHaveLength(0);
  });

  it("removes the mirrored payment when the gift is deleted", async () => {
    const { db, calls } = fakeDb();

    await removeMirroredDonation(db, "d1");

    expect(only(calls, "deleteMany")[0].args.where).toMatchObject({ id: "d1" });
    expect(withdrawReceiptsBeforeDelete).toHaveBeenCalledWith(db, { id: "d1" });
  });
});

const MEMBERSHIP = {
  userId: "u1",
  year: 2026,
  amount: 3000,
  feeApplied: 1000,
  method: "بنكيلي",
  accountId: null,
  bankReference: null,
  proof: null,
  status: "ACTIVE" as const,
  anonymous: false,
  donorName: null,
};

describe("the payment a membership is mirrored into", () => {
  it("makes one when the member has paid something", async () => {
    const { db, calls } = fakeDb();

    await mirrorMembershipPayment(db, MEMBERSHIP);

    expect(only(calls, "create")[0].args.data).toMatchObject({
      purpose: "MEMBERSHIP",
      userId: "u1",
      year: 2026,
      amount: 3000,
    });
  });

  it("updates the one already standing", async () => {
    const { db, calls } = fakeDb({ id: "p1" });

    await mirrorMembershipPayment(db, MEMBERSHIP);

    expect(only(calls, "create")).toHaveLength(0);
    expect(only(calls, "update")[0].args.data).toMatchObject({ amount: 3000 });
  });

  it("takes it away when the amount is gone or is nothing", async () => {
    for (const amount of [null, 0, -1]) {
      const { db, calls } = fakeDb({ id: "p1" });
      await mirrorMembershipPayment(db, { ...MEMBERSHIP, amount });
      expect(only(calls, "delete")).toHaveLength(1);
      expect(withdrawReceiptsBeforeDelete).toHaveBeenCalledWith(db, { id: "p1" });
    }
  });

  it("moves the status of the year's membership payment", async () => {
    const { db, calls } = fakeDb();

    await mirrorMembershipStatus(db, "u1", 2026, "REJECTED");

    expect(only(calls, "updateMany")[0].args).toMatchObject({
      where: { userId: "u1", year: 2026, purpose: "MEMBERSHIP" },
      data: { status: "REJECTED" },
    });
  });

  it("stamps who recorded it, and only where nobody is stamped yet", async () => {
    const { db, calls } = fakeDb();

    await stampRecordedBy(db, "u1", 2026, "boss");

    expect(only(calls, "updateMany")[0].args).toMatchObject({
      where: { userId: "u1", year: 2026, purpose: "MEMBERSHIP", recordedBy: null },
      data: { recordedBy: "boss" },
    });
  });
});
