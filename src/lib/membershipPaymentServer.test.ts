import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./paymentReceiptServer", () => ({
  ensureReceiptsFor: vi.fn(async () => []),
  syncReceiptsFor: vi.fn(async () => []),
}));

import { recordFeeVerdict, writeMembershipFee } from "./membershipPaymentServer";

type Call = { op: string; args: Record<string, unknown> };

function fakeDb(standing: { id: string } | null = null) {
  const calls: Call[] = [];
  const record =
    (op: string) =>
    async (args: Record<string, unknown> = {}) => {
      calls.push({ op, args });
      return { id: "made" };
    };
  const db = {
    payment: {
      findFirst: vi.fn(async () => standing),
      create: vi.fn(record("create")),
      update: vi.fn(record("update")),
      updateMany: vi.fn(record("updateMany")),
      delete: vi.fn(record("delete")),
    },
    user: { findUnique: vi.fn(async () => ({ fullName: "محمد" })) },
  };
  return { db: db as never, calls };
}

const only = (calls: Call[], op: string) => calls.filter((c) => c.op === op);

const REVIEWED_ON = new Date("2026-02-03T10:00:00.000Z");

const FEE = {
  method: "بنكيلي",
  accountId: null,
  bankReference: null,
  proof: null,
  referenceCode: "AJ-1234",
  status: "ACTIVE" as const,
  reviewedBy: "boss",
  reviewedAt: REVIEWED_ON,
  recordedBy: "boss",
};

beforeEach(() => vi.clearAllMocks());

describe("the payment a membership fee is written to", () => {
  it("makes one when the member has paid something", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, FEE);

    expect(only(calls, "create")[0].args.data).toMatchObject({
      purpose: "MEMBERSHIP",
      userId: "u1",
      year: 2026,
      amount: 3000,
      feeApplied: 1000,
    });
  });

  it("carries the reference code, the recorder and the reviewer onto a new one", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, FEE);

    expect(only(calls, "create")[0].args.data).toMatchObject({
      referenceCode: "AJ-1234",
      recordedBy: "boss",
      reviewedBy: "boss",
      reviewedAt: REVIEWED_ON,
    });
  });

  it("records the visibility answer on a new one and no name of its own", async () => {
    const named = fakeDb();
    await writeMembershipFee(named.db, "u1", 2026, 3000, 1000, FEE);
    const shown = only(named.calls, "create")[0].args.data as Record<string, unknown>;
    expect(shown.anonymous).toBe(false);
    expect(shown).not.toHaveProperty("donorName");

    const hidden = fakeDb();
    await writeMembershipFee(hidden.db, "u1", 2026, 3000, 1000, { ...FEE, anonymous: true });
    const kept = only(hidden.calls, "create")[0].args.data as Record<string, unknown>;
    expect(kept.anonymous).toBe(true);
    expect(kept).not.toHaveProperty("donorName");
  });

  it("corrects the one already standing rather than adding a second", async () => {
    const { db, calls } = fakeDb({ id: "p1" });

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, FEE);

    expect(only(calls, "create")).toHaveLength(0);
    expect(only(calls, "update")[0].args.data).toMatchObject({
      amount: 3000,
      referenceCode: "AJ-1234",
      reviewedBy: "boss",
    });
  });

  it("leaves out what the caller did not name", async () => {
    const { db, calls } = fakeDb({ id: "p1" });

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, { method: "بنكيلي" });

    expect(only(calls, "update")[0].args.data).toEqual({
      method: "بنكيلي",
      amount: 3000,
      feeApplied: 1000,
    });
  });

  it("records nothing transferred as an amount rather than as a removal", async () => {
    const { db, calls } = fakeDb({ id: "p1" });

    await writeMembershipFee(db, "u1", 2026, 0, 1000, FEE);

    expect(only(calls, "delete")).toHaveLength(0);
    expect(only(calls, "update")[0].args.data).toMatchObject({ amount: 0, feeApplied: 1000 });
  });

  it("never takes a standing payment away, whatever the amount", async () => {
    const { db, calls } = fakeDb({ id: "p1" });

    await writeMembershipFee(db, "u1", 2026, null, 1000, FEE);

    expect(only(calls, "delete")).toHaveLength(0);
    expect(only(calls, "update")).toHaveLength(0);
  });

  it("writes nothing at all when the caller names no amount", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, null, 1000, FEE);

    expect(calls.filter((c) => c.op !== "findFirst")).toHaveLength(0);
  });
});

describe("the verdict a membership payment carries", () => {
  it("lands on the year's membership payment", async () => {
    const { db, calls } = fakeDb();

    await recordFeeVerdict(db, "u1", 2026, { status: "REJECTED" }, REVIEWED_ON);

    expect(only(calls, "updateMany")[0].args).toMatchObject({
      where: { userId: "u1", year: 2026, purpose: "MEMBERSHIP" },
      data: { status: "REJECTED" },
    });
  });

  it("takes the reviewer with it when one is named", async () => {
    const { db, calls } = fakeDb();

    await recordFeeVerdict(db, "u1", 2026, { status: "ACTIVE", reviewedBy: "boss" }, REVIEWED_ON);

    expect(only(calls, "updateMany")[0].args.data).toEqual({
      status: "ACTIVE",
      reviewedBy: "boss",
      reviewedAt: REVIEWED_ON,
    });
  });

  it("leaves the reviewer alone when the verdict names nobody", async () => {
    const { db, calls } = fakeDb();

    await recordFeeVerdict(db, "u1", 2026, { status: "PENDING" }, REVIEWED_ON);

    expect(only(calls, "updateMany")[0].args.data).toEqual({ status: "PENDING" });
  });

  it("never takes a payment away, whatever the verdict", async () => {
    const { db, calls } = fakeDb({ id: "p1" });

    await recordFeeVerdict(db, "u1", 2026, { status: "REJECTED" }, REVIEWED_ON);

    expect(only(calls, "delete")).toHaveLength(0);
  });
});
