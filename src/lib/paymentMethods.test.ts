import { describe, it, expect } from "vitest";
import {
  INITIAL_PAYMENT_ACCOUNTS,
  INITIAL_PAYMENT_METHODS,
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

describe("the list the table is seeded with", () => {
  it("keeps cash out of what a member may pick", () => {
    const cash = INITIAL_PAYMENT_METHODS.find((m) => m.name === "نقداً");
    expect(cash?.memberFacing).toBe(false);
  });

  it("offers every other seeded method to a member", () => {
    const rest = INITIAL_PAYMENT_METHODS.filter((m) => m.name !== "نقداً");
    expect(rest.every((m) => m.memberFacing)).toBe(true);
  });

  it("gives every seeded method its own position", () => {
    const positions = INITIAL_PAYMENT_METHODS.map((m) => m.position);
    expect(new Set(positions).size).toBe(positions.length);
  });
});

describe("the accounts the table is seeded with", () => {
  it("puts every account under a seeded method", () => {
    const names = INITIAL_PAYMENT_METHODS.map((m) => m.name);
    expect(INITIAL_PAYMENT_ACCOUNTS.every((a) => names.includes(a.method))).toBe(true);
  });

  it("leaves cash without one", () => {
    expect(INITIAL_PAYMENT_ACCOUNTS.some((a) => a.method === "نقداً")).toBe(false);
  });

  it("gives a method at most one seeded account", () => {
    const methods = INITIAL_PAYMENT_ACCOUNTS.map((a) => a.method);
    expect(new Set(methods).size).toBe(methods.length);
  });

  it("opens each one first in its method", () => {
    expect(INITIAL_PAYMENT_ACCOUNTS.every((a) => a.position === 1)).toBe(true);
  });

  it("gives every account a code", () => {
    expect(INITIAL_PAYMENT_ACCOUNTS.every((a) => a.code.trim().length > 0)).toBe(true);
  });
});
