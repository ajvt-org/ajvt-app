import { describe, it, expect, beforeEach, vi } from "vitest";
import { ensureReceiptsFor } from "./paymentReceiptServer";
import { money } from "./messages";

const MEMBERSHIP = {
  id: "p1",
  amount: 1000,
  purpose: "MEMBERSHIP",
  year: 2026,
  createdAt: new Date(2026, 7, 24),
  anonymous: false,
  donorName: null,
  memberId: "m1",
  userId: "u1",
  activity: null,
  user: { fullName: "محمد ولد أحمد" },
};

function fakeDb(payments: unknown[], settings: unknown = null) {
  let counter = 0;
  return {
    payment: { findMany: vi.fn().mockResolvedValue(payments) },
    appSettings: { findUnique: vi.fn().mockResolvedValue(settings) },
    counter: {
      upsert: vi.fn().mockImplementation(async () => ({ value: ++counter })),
    },
    receipt: {
      create: vi.fn().mockImplementation(async ({ data }: { data: unknown }) => data),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("issuing a receipt for a payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only looks at active payments that have none yet", async () => {
    const db = fakeDb([]);

    await ensureReceiptsFor(db, { memberId: "m1" });

    expect(db.payment.findMany.mock.calls[0][0].where).toMatchObject({
      memberId: "m1",
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
    expect(db.receipt.create.mock.calls[0][0].data.memberId).toBe("m1");
  });

  it("leaves the account off a receipt for a payment with no account", async () => {
    const db = fakeDb([{ ...MEMBERSHIP, memberId: null, userId: null, user: null }]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data.userId).toBeNull();
  });

  it("names the member who paid", async () => {
    const db = fakeDb([MEMBERSHIP]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data.payerName).toBe("محمد ولد أحمد");
  });

  it("names the account over a donor name typed onto a linked payment", async () => {
    const db = fakeDb([{ ...MEMBERSHIP, donorName: "ابو" }]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data.payerName).toBe("محمد ولد أحمد");
  });

  it("names an anonymous donor the way the board does", async () => {
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

  it("ties the receipt to the payment and the member", async () => {
    const db = fakeDb([MEMBERSHIP]);

    await ensureReceiptsFor(db, {});

    expect(db.receipt.create.mock.calls[0][0].data).toMatchObject({
      paymentId: "p1",
      memberId: "m1",
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
