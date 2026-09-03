import { describe, it, expect } from "vitest";
import {
  acceptedNames,
  acceptsMethod,
  inOrder,
  memberMethods,
  methodNames,
  offeredMethods,
  type PaymentMethodOption,
} from "./paymentMethods";

function method(over: Partial<PaymentMethodOption> & { name: string }): PaymentMethodOption {
  return {
    id: over.name,
    memberFacing: true,
    active: true,
    position: 0,
    ...over,
  };
}

const ONLINE = method({ name: "online", position: 1 });
const TRANSFER = method({ name: "transfer", position: 2 });
const CASH = method({ name: "cash", position: 3, memberFacing: false });
const RETIRED = method({ name: "retired", position: 4, active: false });

describe("payment method ordering", () => {
  it("sorts by position rather than by name", () => {
    expect(methodNames(inOrder([CASH, ONLINE, TRANSFER]))).toEqual(["online", "transfer", "cash"]);
  });

  it("breaks a shared position by name so the order never wobbles", () => {
    const a = method({ name: "b", position: 1 });
    const b = method({ name: "a", position: 1 });
    expect(methodNames(inOrder([a, b]))).toEqual(["a", "b"]);
  });

  it("keeps a deactivated method in its place for anything reading every method", () => {
    expect(methodNames(inOrder([RETIRED, ONLINE]))).toEqual(["online", "retired"]);
  });
});

describe("what a selector offers", () => {
  it("leaves out a deactivated method", () => {
    expect(methodNames(offeredMethods([ONLINE, RETIRED]))).toEqual(["online"]);
  });

  it("leaves out an admin only method for a member", () => {
    expect(methodNames(memberMethods([ONLINE, CASH]))).toEqual(["online"]);
  });

  it("leaves out a method that is deactivated even when members could pick it", () => {
    const gone = method({ name: "gone", active: false, memberFacing: true });
    expect(methodNames(memberMethods([ONLINE, gone]))).toEqual(["online"]);
  });
});

describe("what validation accepts", () => {
  const offered = ["online", "transfer"];

  it("accepts a method that is still offered", () => {
    expect(acceptsMethod(offered, "online")).toBe(true);
  });

  it("refuses a method that is not offered when nothing is held", () => {
    expect(acceptsMethod(offered, "retired")).toBe(false);
  });

  it("accepts the value a record already holds even once it stops being offered", () => {
    expect(acceptsMethod(offered, "retired", "retired")).toBe(true);
  });

  it("refuses a different unoffered method even when the record holds one", () => {
    expect(acceptsMethod(offered, "other", "retired")).toBe(false);
  });

  it("does not list a held method twice when it is still offered", () => {
    expect(acceptedNames(offered, "online")).toEqual(["online", "transfer"]);
  });

  it("ignores a blank held value", () => {
    expect(acceptedNames(offered, "  ")).toEqual(offered);
    expect(acceptedNames(offered, null)).toEqual(offered);
  });
});
