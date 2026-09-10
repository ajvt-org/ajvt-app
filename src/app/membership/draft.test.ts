import { describe, it, expect } from "vitest";
import { parseDraft } from "./draft";

describe("reading a payment draft back out of the browser", () => {
  it("fills the keys a draft written before the transaction number field is missing", () => {
    const old = JSON.stringify({
      fullName: "x",
      phone: "22200000",
      village: "y",
      age: "z",
      paymentMethod: "بنكيلي",
      paidAmount: "700",
      referenceCode: "AB12",
    });
    expect(parseDraft(old)).toEqual({
      paymentMethod: "بنكيلي",
      accountId: "",
      bankReference: "",
      paidAmount: "700",
      referenceCode: "AB12",
    });
  });

  it("keeps only the five keys the form holds", () => {
    const parsed = parseDraft(JSON.stringify({ fullName: "x", phone: "22200000" }));
    expect(Object.keys(parsed).sort()).toEqual([
      "accountId",
      "bankReference",
      "paidAmount",
      "paymentMethod",
      "referenceCode",
    ]);
  });

  it("refuses a value of the wrong type", () => {
    const parsed = parseDraft(JSON.stringify({ paidAmount: 700, bankReference: null }));
    expect(parsed.paidAmount).toBe("");
    expect(parsed.bankReference).toBe("");
  });

  it("gives an empty form for a stored value that is not an object", () => {
    expect(parseDraft("[1,2]").paymentMethod).toBe("");
    expect(parseDraft("null").referenceCode).toBe("");
    expect(parseDraft('"text"').bankReference).toBe("");
  });

  it("throws on a stored value that is not JSON", () => {
    expect(() => parseDraft("{oops")).toThrow();
  });
});
