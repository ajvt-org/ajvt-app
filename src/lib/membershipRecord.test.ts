import { describe, it, expect } from "vitest";
import { membershipEdit } from "@/lib/membershipRecord";

describe("membershipEdit", () => {
  it("carries no money, which the payment owns", () => {
    expect(membershipEdit({ paidAmount: 100 } as never)).toEqual({});
  });

  it("leaves out anything the edit did not touch", () => {
    expect(membershipEdit({ paymentMethod: "بنكيلي" })).toEqual({ paymentMethod: "بنكيلي" });
    expect(membershipEdit({})).toEqual({});
  });

  it("carries a proof added after the fact", () => {
    expect(membershipEdit({ paymentProof: "proof.webp" })).toEqual({ paymentProof: "proof.webp" });
  });

  it("carries a cleared proof rather than dropping it", () => {
    expect(membershipEdit({ paymentProof: null })).toEqual({ paymentProof: null });
  });
});
