import { describe, it, expect, beforeEach, vi } from "vitest";
import { ensureReceiptsFor, receiptDriftFor, reconcileReceiptsFor } from "./paymentReceiptServer";
import { money, receipts as receiptMessages } from "./messages";

const MEMBERSHIP = {
  id: "p1",
  amount: 1000,
  purpose: "MEMBERSHIP",
  year: 2026,
  createdAt: new Date(2026, 7, 24),
  anonymous: false,
  donorName: null,
  userId: "u1",
  activity: null,
  user: { fullName: "محمد ولد أحمد" },
};

function fakeDb(payments: unknown[], settings: unknown = null, standing: unknown[] = []) {
  let counter = 0;
  return {
    payment: { findMany: vi.fn().mockResolvedValue(payments) },
    appSettings: { findUnique: vi.fn().mockResolvedValue(settings) },
    counter: {
      upsert: vi.fn().mockImplementation(async () => ({ value: ++counter })),
    },
    receipt: {
      create: vi.fn().mockImplementation(async ({ data }: { data: unknown }) => data),
      findMany: vi.fn().mockResolvedValue(standing),
      update: vi.fn().mockImplementation(async ({ data }: { data: unknown }) => data),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const STANDING = {
  id: "r1",
  number: "R-2026-0001",
  amount: 1000,
  payerName: "محمد ولد أحمد",
  reason: "اشتراك عضوية 2026",
  userId: "u1",
  payment: MEMBERSHIP,
};

function drifting(over: Record<string, unknown>) {
  return fakeDb([], null, [{ ...STANDING, ...over }]);
}

describe("issuing a receipt for a payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only looks at active payments that have none yet", async () => {
    const db = fakeDb([]);

    await ensureReceiptsFor(db, { userId: "u1" });

    expect(db.payment.findMany.mock.calls[0][0].where).toMatchObject({
      userId: "u1",
      status: "ACTIVE",
      receipt: { is: null },
    });
  });

  it("numbers in the order the payments were taken", async () => {
    const db = fakeDb([]);

    await ensureReceiptsFor(db, {});

    expect(db.payment.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: "asc" });
  });

  it("does nothing at all when every payment already has one", async () => {
    const db = fakeDb([]);

    expect(await ensureReceiptsFor(db, {})).toEqual([]);
    expect(db.receipt.create).not.toHaveBeenCalled();
    expect(db.counter.upsert).not.toHaveBeenCalled();
  });

  it("takes its number from the year the payment was taken, not today", async () => {
    const db = fakeDb([MEMBERSHIP]);

    await ensureReceiptsFor(db, {});

    expect(db.counter.upsert.mock.calls[0][0].where).toEqual({ id: "receipt:2026" });
    expect(db.receipt.create.mock.calls[0][0].data.number).toBe("R-2026-0001");
    expect(db.receipt.create.mock.calls[0][0].data.issuedOn).toEqual(MEMBERSHIP.createdAt);
  });

  it("keeps the payer's account on the receipt", async () => {
    const db = fakeDb([MEMBERSHIP]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data.userId).toBe("u1");
  });

  it("leaves the account off a receipt for a payment with no account", async () => {
    const db = fakeDb([{ ...MEMBERSHIP, userId: null, user: null }]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data.userId).toBeNull();
  });

  it("names the member who paid", async () => {
    const db = fakeDb([MEMBERSHIP]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data.payerName).toBe("محمد ولد أحمد");
  });

  it("names the payer even when the gift is hidden from the board", async () => {
    const db = fakeDb([{ ...MEMBERSHIP, anonymous: true }]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data.payerName).toBe("محمد ولد أحمد");
  });

  it("names the account over a donor name typed onto a linked payment", async () => {
    const db = fakeDb([{ ...MEMBERSHIP, donorName: "ابو" }]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data.payerName).toBe("محمد ولد أحمد");
  });

  it("has nothing to name when a giver left no name at all", async () => {
    const db = fakeDb([
      { ...MEMBERSHIP, purpose: "DONATION", year: null, anonymous: true, user: null },
    ]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data.payerName).toBe(money.anonymousDonor);
  });

  it("falls back to the donor name typed in by hand", async () => {
    const db = fakeDb([
      { ...MEMBERSHIP, purpose: "DONATION", year: null, user: null, donorName: "أحمد سالم" },
    ]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data.payerName).toBe("أحمد سالم");
  });

  it("reads the reason off the purpose, naming the year and the activity", async () => {
    const db = fakeDb([
      MEMBERSHIP,
      {
        ...MEMBERSHIP,
        id: "p2",
        purpose: "ACTIVITY",
        year: null,
        activity: { title: "دورة رمضان" },
      },
      { ...MEMBERSHIP, id: "p3", purpose: "DONATION", year: null },
    ]);

    await ensureReceiptsFor(db, {});

    const reasons = db.receipt.create.mock.calls.map(
      (call: [{ data: { reason: string } }]) => call[0].data.reason,
    );
    expect(reasons).toEqual(["اشتراك عضوية 2026", "دعم نشاط — دورة رمضان", "تبرع"]);
  });

  it("copies the officers off the settings, and copes with none saved yet", async () => {
    const withOfficers = fakeDb([MEMBERSHIP], {
      secretaryName: "الأمين",
      treasurerName: "المالية",
    });
    await ensureReceiptsFor(withOfficers, {});
    expect(withOfficers.receipt.create.mock.calls[0][0].data).toMatchObject({
      secretary: "الأمين",
      treasurer: "المالية",
    });

    const without = fakeDb([MEMBERSHIP]);
    await ensureReceiptsFor(without, {});
    expect(without.receipt.create.mock.calls[0][0].data).toMatchObject({
      secretary: null,
      treasurer: null,
    });
  });

  it("ties the receipt to the payment and the account", async () => {
    const db = fakeDb([MEMBERSHIP]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data).toMatchObject({
      paymentId: "p1",
      userId: "u1",
      amount: 1000,
    });
  });

  it("gives each receipt a token of its own", async () => {
    const db = fakeDb([MEMBERSHIP, { ...MEMBERSHIP, id: "p2" }]);

    await ensureReceiptsFor(db, {});

    const [first, second] = db.receipt.create.mock.calls.map(
      (call: [{ data: { token: string } }]) => call[0].data.token,
    );
    expect(first).toHaveLength(32);
    expect(first).not.toBe(second);
  });

  it("counts up across the payments it issues in one pass", async () => {
    const db = fakeDb([MEMBERSHIP, { ...MEMBERSHIP, id: "p2" }, { ...MEMBERSHIP, id: "p3" }]);

    const issued = await ensureReceiptsFor(db, {});

    expect(issued.map((r) => (r as { number: string }).number)).toEqual([
      "R-2026-0001",
      "R-2026-0002",
      "R-2026-0003",
    ]);
  });
});

describe("reconciling a receipt with its payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks only at standing receipts whose payment still stands", async () => {
    const db = drifting({});

    await receiptDriftFor(db, { id: "p1" });

    expect(db.receipt.findMany.mock.calls[0][0].where).toEqual({
      status: "ACTIVE",
      payment: { is: { id: "p1", status: "ACTIVE" } },
    });
  });

  it("finds nothing to do when the receipt still agrees", async () => {
    expect(await receiptDriftFor(drifting({}), {})).toEqual([]);
  });

  it("asks for a new number when the amount no longer agrees", async () => {
    const [drift] = await receiptDriftFor(drifting({ amount: 2000 }), {});

    expect(drift.action).toBe("reissue");
    expect(drift.changes).toEqual([{ field: "amount", from: 2000, to: 1000 }]);
  });

  it("reports what else drifted on a receipt that needs a new number", async () => {
    const [drift] = await receiptDriftFor(
      drifting({ amount: 2000, payerName: "ابو", userId: null }),
      {},
    );

    expect(drift.action).toBe("reissue");
    expect(drift.changes.map((c) => c.field)).toEqual(["amount", "payerName", "userId"]);
  });

  it("asks for a correction in place when only the payer changed", async () => {
    const [drift] = await receiptDriftFor(drifting({ payerName: "ابو" }), {});

    expect(drift.action).toBe("correct");
    expect(drift.changes).toEqual([{ field: "payerName", from: "ابو", to: "محمد ولد أحمد" }]);
  });

  it("asks for the account to be filled in on a receipt issued before the link", async () => {
    const [drift] = await receiptDriftFor(drifting({ userId: null }), {});

    expect(drift.action).toBe("correct");
    expect(drift.changes).toEqual([{ field: "userId", from: null, to: "u1" }]);
  });

  it("voids and lets go of the payment when the amount was corrected", async () => {
    const db = drifting({ amount: 2000 });

    const detached = await reconcileReceiptsFor(db, {});

    expect(detached).toHaveLength(1);
    expect(db.receipt.update.mock.calls[0][0]).toMatchObject({
      where: { id: "r1" },
      data: {
        status: "VOID",
        voidReason: receiptMessages.correctedPending,
        paymentId: null,
      },
    });
  });

  it("writes only the fields that drifted when correcting in place", async () => {
    const db = drifting({ payerName: "ابو" });

    const detached = await reconcileReceiptsFor(db, {});

    expect(detached).toEqual([]);
    expect(db.receipt.update.mock.calls[0][0]).toEqual({
      where: { id: "r1" },
      data: { payerName: "محمد ولد أحمد" },
    });
  });

  it("leaves an untouched receipt alone rather than rewriting it", async () => {
    const db = drifting({});

    await reconcileReceiptsFor(db, {});

    expect(db.receipt.update).not.toHaveBeenCalled();
  });
});
