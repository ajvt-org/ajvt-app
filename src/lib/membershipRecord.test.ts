import { describe, it, expect } from "vitest";
import { membershipEdit } from "@/lib/membershipRecord";

describe("membershipEdit", () => {
  it("carries an amount the admin entered", () => {
    expect(membershipEdit({ paidAmount: 100 })).toEqual({ paidAmount: 100 });
  });

  it("carries a cleared amount rather than dropping it", () => {
    expect(membershipEdit({ paidAmount: null })).toEqual({ paidAmount: null });
  });

  it("leaves out anything the edit did not touch", () => {
    expect(membershipEdit({ paymentMethod: "بنكيلي" })).toEqual({ paymentMethod: "بنكيلي" });
    expect(membershipEdit({})).toEqual({});
  });
});
