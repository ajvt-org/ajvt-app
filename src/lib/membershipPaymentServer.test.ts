import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./paymentReceiptServer", () => ({
  syncReceiptsFor: vi.fn(async () => []),
}));

import { recordFeeVerdict, writeMembershipFee } from "./membershipPaymentServer";

type Call = { op: string; args: Record<string, unknown> };

function fakeDb() {
  const calls: Call[] = [];
  const record =
    (op: string) =>
    async (args: Record<string, unknown> = {}) => {
      calls.push({ op, args });
      return { id: "made" };
    };
  const db = {
    payment: {
      findFirst: vi.fn(async () => null),
      upsert: vi.fn(record("upsert")),
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

const written = (calls: Call[], half: "create" | "update") =>
  (only(calls, "upsert")[0].args[half] ?? {}) as Record<string, unknown>;

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
  recorder: { name: "boss", adminId: "a1" },
};

beforeEach(() => vi.clearAllMocks());

describe("the payment a membership fee is written to", () => {
  it("keys the write on the member, the year and the purpose", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, FEE);

    expect(only(calls, "upsert")).toHaveLength(1);
    expect(only(calls, "upsert")[0].args.where).toEqual({
      userId_year_purpose: { userId: "u1", year: 2026, purpose: "MEMBERSHIP" },
    });
  });

  it("never reads first to decide which half applies", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, FEE);

    expect(only(calls, "findFirst")).toHaveLength(0);
    expect(only(calls, "create")).toHaveLength(0);
    expect(only(calls, "update")).toHaveLength(0);
  });

  it("makes one when the member has paid something", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, FEE);

    expect(written(calls, "create")).toMatchObject({
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

    expect(written(calls, "create")).toMatchObject({
      referenceCode: "AJ-1234",
      recordedBy: "boss",
      recordedByAdminId: "a1",
      reviewedBy: "boss",
      reviewedAt: REVIEWED_ON,
    });
  });

  it("writes the recorder's name and admin id together or not at all", async () => {
    const withAdmin = fakeDb();
    await writeMembershipFee(withAdmin.db, "u1", 2026, 3000, 1000, FEE);
    expect(written(withAdmin.calls, "create")).toMatchObject({
      recordedBy: "boss",
      recordedByAdminId: "a1",
    });

    const bySelf = fakeDb();
    await writeMembershipFee(bySelf.db, "u1", 2026, 3000, 1000, {
      ...FEE,
      recorder: { name: "محمد ولد أحمد", adminId: null },
    });
    expect(written(bySelf.calls, "create")).toMatchObject({
      recordedBy: "محمد ولد أحمد",
      recordedByAdminId: null,
    });
  });

  it("clears the admin id when a member pays against a row an admin recorded", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, {
      recorder: { name: "محمد ولد أحمد", adminId: null },
    });

    expect(written(calls, "update")).toMatchObject({
      recordedBy: "محمد ولد أحمد",
      recordedByAdminId: null,
    });
  });

  it("leaves both alone when the caller names no recorder", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, { method: "بنكيلي" });

    const data = written(calls, "update");
    expect(data).not.toHaveProperty("recordedBy");
    expect(data).not.toHaveProperty("recordedByAdminId");
  });

  it("records the visibility answer on a new one and no name of its own", async () => {
    const named = fakeDb();
    await writeMembershipFee(named.db, "u1", 2026, 3000, 1000, FEE);
    const shown = written(named.calls, "create");
    expect(shown.anonymous).toBe(false);
    expect(shown).not.toHaveProperty("donorName");

    const hidden = fakeDb();
    await writeMembershipFee(hidden.db, "u1", 2026, 3000, 1000, { ...FEE, anonymous: true });
    const kept = written(hidden.calls, "create");
    expect(kept.anonymous).toBe(true);
    expect(kept).not.toHaveProperty("donorName");
  });

  it("corrects the one already standing rather than adding a second", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, FEE);

    expect(written(calls, "update")).toMatchObject({
      amount: 3000,
      referenceCode: "AJ-1234",
      reviewedBy: "boss",
      recordedBy: "boss",
      recordedByAdminId: "a1",
    });
  });

  it("leaves the visibility answer alone on the one already standing", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, { ...FEE, anonymous: true });

    expect(written(calls, "update")).not.toHaveProperty("anonymous");
  });

  it("leaves out what the caller did not name", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 3000, 1000, { method: "بنكيلي" });

    expect(written(calls, "update")).toEqual({
      method: "بنكيلي",
      amount: 3000,
      feeApplied: 1000,
    });
  });

  it("records nothing transferred as an amount rather than as a removal", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, 0, 1000, FEE);

    expect(only(calls, "delete")).toHaveLength(0);
    expect(written(calls, "update")).toMatchObject({ amount: 0, feeApplied: 1000 });
  });

  it("never takes a standing payment away, whatever the amount", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, null, 1000, FEE);

    expect(only(calls, "delete")).toHaveLength(0);
    expect(only(calls, "upsert")).toHaveLength(0);
  });

  it("writes nothing at all when the caller names no amount", async () => {
    const { db, calls } = fakeDb();

    await writeMembershipFee(db, "u1", 2026, null, 1000, FEE);

    expect(calls).toHaveLength(0);
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
    const { db, calls } = fakeDb();

    await recordFeeVerdict(db, "u1", 2026, { status: "REJECTED" }, REVIEWED_ON);

    expect(only(calls, "delete")).toHaveLength(0);
  });
});
