import { describe, it, expect } from "vitest";
import { donationLogSnapshot, donationWasChanged } from "./donationChangeLog";

const ROW = {
  anonymous: false,
  donorName: "خالد الأمين",
  donorPhone: "33655124",
  donorPhoto: null,
  amount: 2000,
  paymentMethod: "بنكيلي",
  accountId: "a1",
  bankReference: "TR10000000001",
  proof: "p.webp",
};

describe("what counts as a change to a donation", () => {
  it("counts a correction to the account the money landed in", () => {
    expect(donationWasChanged({ accountId: "a2" })).toBe(true);
  });

  it("counts a correction to the operation number that proves it", () => {
    expect(donationWasChanged({ bankReference: "TR10000000002" })).toBe(true);
  });

  it("counts clearing either of them", () => {
    expect(donationWasChanged({ accountId: null })).toBe(true);
    expect(donationWasChanged({ bankReference: null })).toBe(true);
  });

  it("counts a correction to the amount or the method", () => {
    expect(donationWasChanged({ amount: 3000 })).toBe(true);
    expect(donationWasChanged({ paymentMethod: "نقداً" })).toBe(true);
  });

  it("counts nothing when the body named none of them", () => {
    expect(donationWasChanged({})).toBe(false);
    expect(donationWasChanged({ amount: undefined, accountId: undefined })).toBe(false);
  });
});

describe("what the log keeps of a donation after a change", () => {
  it("keeps the account and the operation number beside the money", () => {
    expect(donationLogSnapshot(ROW)).toMatchObject({
      accountId: "a1",
      bankReference: "TR10000000001",
      amount: 2000,
      paymentMethod: "بنكيلي",
    });
  });

  it("keeps every field a change is watched for and nothing else", () => {
    expect(Object.keys(donationLogSnapshot({ ...ROW, id: "d1" } as typeof ROW))).toEqual(
      Object.keys(ROW),
    );
  });
});
