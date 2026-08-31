import { describe, it, expect } from "vitest";
import { linkedAccount } from "./linkedAccount";

const ACCOUNTS = [
  { userId: "u1", fullName: "أبوبكر لمرابط" },
  { userId: "u2", fullName: "الداه الحسن" },
];

describe("the account a payment is linked to", () => {
  it("is the one whose id the payment names", () => {
    expect(linkedAccount(ACCOUNTS, "u2")?.fullName).toBe("الداه الحسن");
  });

  it("is nobody when the payment names no account", () => {
    expect(linkedAccount(ACCOUNTS, null)).toBeUndefined();
    expect(linkedAccount(ACCOUNTS, undefined)).toBeUndefined();
    expect(linkedAccount(ACCOUNTS, "")).toBeUndefined();
  });

  it("is nobody when an account in the list carries no id either", () => {
    const missing = [{ userId: undefined }, ...ACCOUNTS] as unknown as typeof ACCOUNTS;

    expect(linkedAccount(missing, undefined)).toBeUndefined();
  });

  it("is nobody when no account matches", () => {
    expect(linkedAccount(ACCOUNTS, "u9")).toBeUndefined();
  });
});
