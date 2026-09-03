import { describe, it, expect } from "vitest";
import {
  methodChoiceNames,
  withHeldMethod,
  type PaymentMethodChoice,
} from "./paymentMethodChoices";

const OFFERED: PaymentMethodChoice[] = [
  { name: "online", memberFacing: true },
  { name: "cash", memberFacing: false },
];

describe("the method a record already holds", () => {
  it("is added to the list when it is no longer offered", () => {
    expect(methodChoiceNames(withHeldMethod(OFFERED, "retired"))).toEqual([
      "online",
      "cash",
      "retired",
    ]);
  });

  it("is not repeated when it is still offered", () => {
    expect(methodChoiceNames(withHeldMethod(OFFERED, "cash"))).toEqual(["online", "cash"]);
  });

  it("is ignored when the record holds nothing", () => {
    expect(withHeldMethod(OFFERED, null)).toEqual(OFFERED);
    expect(withHeldMethod(OFFERED, "  ")).toEqual(OFFERED);
  });

  it("goes last so the offered methods keep the order an admin set", () => {
    expect(methodChoiceNames(withHeldMethod(OFFERED, "retired"))[2]).toBe("retired");
  });
});
