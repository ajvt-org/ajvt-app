import { describe, it, expect } from "vitest";
import {
  amountAfterEdit,
  feeAfterEdit,
  methodAfterEdit,
  touchesPayment,
  type StandingFee,
} from "./membershipFeeEdit";

const REVIEWED_ON = new Date("2026-02-03T10:00:00.000Z");

const CURRENT: StandingFee = {
  feeApplied: 1000,
  paymentMethod: "بنكيلي",
  accountId: "acc1",
  bankReference: "REF-1",
  paymentProof: "slip.webp",
  referenceCode: "AJ-1234",
  recordedBy: "boss",
  reviewedBy: "boss",
  reviewedAt: REVIEWED_ON,
  status: "ACTIVE",
};

describe("whether an edit reaches the payment at all", () => {
  it("says no when the admin named none of its fields", () => {
    expect(touchesPayment({})).toBe(false);
    expect(touchesPayment({ membershipDecision: "end" } as never)).toBe(false);
  });

  it("says yes for each field on its own", () => {
    expect(touchesPayment({ amountTransferred: 0 })).toBe(true);
    expect(touchesPayment({ paymentMethod: "بنكيلي" })).toBe(true);
    expect(touchesPayment({ accountId: null })).toBe(true);
    expect(touchesPayment({ paymentProof: null })).toBe(true);
    expect(touchesPayment({ bankReference: null })).toBe(true);
    expect(touchesPayment({ paidOn: null })).toBe(true);
  });
});

describe("the amount a membership payment holds after an edit", () => {
  it("takes the one the admin named, including nothing transferred", () => {
    expect(amountAfterEdit({ amountTransferred: 2000 }, 500)).toBe(2000);
    expect(amountAfterEdit({ amountTransferred: 0 }, 500)).toBe(0);
  });

  it("keeps what was already paid when the admin named no amount", () => {
    expect(amountAfterEdit({}, 500)).toBe(500);
    expect(amountAfterEdit({}, null)).toBeNull();
  });
});

describe("the method a membership payment holds after an edit", () => {
  it("takes the one the admin named", () => {
    expect(methodAfterEdit({ paymentMethod: "مصرفي" }, CURRENT)).toBe("مصرفي");
  });

  it("keeps the standing one when the admin named none", () => {
    expect(methodAfterEdit({}, CURRENT)).toBe("بنكيلي");
  });
});

describe("the columns a membership payment holds after an edit", () => {
  it("keeps every standing value when the admin named nothing", () => {
    expect(feeAfterEdit({}, CURRENT)).toEqual({
      method: "بنكيلي",
      accountId: "acc1",
      bankReference: "REF-1",
      proof: "slip.webp",
      referenceCode: "AJ-1234",
      status: "ACTIVE",
      reviewedBy: "boss",
      reviewedAt: REVIEWED_ON,
    });
  });

  it("takes each named value over the standing one", () => {
    const edited = feeAfterEdit(
      {
        paymentMethod: "مصرفي",
        accountId: "acc2",
        bankReference: "REF-2",
        paymentProof: "other.webp",
      },
      CURRENT,
    );

    expect(edited).toMatchObject({
      method: "مصرفي",
      accountId: "acc2",
      bankReference: "REF-2",
      proof: "other.webp",
    });
  });

  it("reads an emptied account or reference as cleared rather than as an empty string", () => {
    expect(feeAfterEdit({ accountId: "", bankReference: "" }, CURRENT)).toMatchObject({
      accountId: null,
      bankReference: null,
    });
  });

  it("clears the proof when the admin removes it", () => {
    expect(feeAfterEdit({ paymentProof: null }, CURRENT)).toMatchObject({ proof: null });
  });

  it("leaves the payment date out entirely when the admin did not name one", () => {
    expect(feeAfterEdit({}, CURRENT)).not.toHaveProperty("paidOn");
  });

  it("reads a bare day the admin named onto the payment", () => {
    const edited = feeAfterEdit({ paidOn: "2026-02-03" }, CURRENT) as { paidOn: Date | null };

    expect(edited.paidOn?.toISOString().slice(0, 10)).toBe("2026-02-03");
  });

  it("clears the payment date when the admin empties it", () => {
    expect(feeAfterEdit({ paidOn: null }, CURRENT)).toMatchObject({ paidOn: null });
  });

  it("never lets the admin move the reference code or the verdict", () => {
    const edited = feeAfterEdit({ paymentMethod: "مصرفي" }, CURRENT);

    expect(edited).toMatchObject({
      referenceCode: "AJ-1234",
      status: "ACTIVE",
      reviewedBy: "boss",
      reviewedAt: REVIEWED_ON,
    });
  });
});
