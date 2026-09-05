import { describe, it, expect } from "vitest";
import {
  accountToPreselect,
  accountsOfMethod,
  methodChoiceNames,
  withHeldAccount,
  withHeldMethod,
  type PaymentAccountChoice,
  type PaymentMethodChoice,
} from "./paymentMethodChoices";

const FIRST: PaymentAccountChoice = { id: "a1", code: "111111", label: null };
const SECOND: PaymentAccountChoice = { id: "a2", code: "222222", label: null };

const OFFERED: PaymentMethodChoice[] = [
  { name: "online", memberFacing: true, accounts: [FIRST] },
  { name: "cash", memberFacing: false, accounts: [] },
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

describe("the numbers a chosen method receives into", () => {
  it("are the ones under that method", () => {
    expect(accountsOfMethod(OFFERED, "online")).toEqual([FIRST]);
  });

  it("are none for a method that receives into nothing", () => {
    expect(accountsOfMethod(OFFERED, "cash")).toEqual([]);
  });

  it("are none when no method is chosen", () => {
    expect(accountsOfMethod(OFFERED, "")).toEqual([]);
    expect(accountsOfMethod(OFFERED, null)).toEqual([]);
  });

  it("are none for a method that is not there", () => {
    expect(accountsOfMethod(OFFERED, "missing")).toEqual([]);
  });
});

describe("the number a record already points at", () => {
  it("is added to the list when it is no longer open", () => {
    const closed = { id: "old", code: "999999", label: null };
    expect(withHeldAccount([FIRST], closed).map((a) => a.id)).toEqual(["a1", "old"]);
  });

  it("is not added twice when it is still open", () => {
    expect(withHeldAccount([FIRST], FIRST)).toEqual([FIRST]);
  });

  it("changes nothing when the record points at none", () => {
    expect(withHeldAccount([FIRST], null)).toEqual([FIRST]);
  });
});

describe("what a form starts with selected", () => {
  it("is what the member declared, when it is still open", () => {
    expect(accountToPreselect([FIRST, SECOND], "a2")).toBe("a2");
  });

  it("is the only number, when a method has just the one", () => {
    expect(accountToPreselect([FIRST], null)).toBe("a1");
  });

  it("is nothing, when a method has several and nobody said which", () => {
    expect(accountToPreselect([FIRST, SECOND], null)).toBe("");
  });

  it("is nothing, when the declared one is no longer open", () => {
    expect(accountToPreselect([FIRST], "gone")).toBe("");
  });

  it("is nothing, when the method receives into nothing", () => {
    expect(accountToPreselect([], "a1")).toBe("");
  });
});
