import { describe, it, expect } from "vitest";
import { OWNER_ROLE, SUPER_ROLE } from "./adminRoles";
import { MEMBERSHIP_FEE } from "./donations";
import {
  PUBLIC_VIEWER,
  nameIsConfidential,
  redactIdentity,
  redactPaymentIdentity,
  seesEverySupporterName,
  seesPaymentIdentity,
  seesSupporterName,
  supportPart,
  withoutFields,
} from "./supportPrivacy";

const OWNER = { role: OWNER_ROLE };
const ADMIN = { role: SUPER_ROLE };
const NARROW = { role: "MEMBERS" };

const confidential = { userId: "u1", user: { supportNameConfidential: true } };
const ordinary = { userId: "u2", user: { supportNameConfidential: false } };
const typedIn = { userId: null, user: null };

describe("who may see a supporter name", () => {
  it("gives every name to the role that holds the promise", () => {
    expect(seesEverySupporterName(OWNER)).toBe(true);
    expect(seesEverySupporterName(ADMIN)).toBe(false);
    expect(seesEverySupporterName(NARROW)).toBe(false);
    expect(seesEverySupporterName(PUBLIC_VIEWER)).toBe(false);
  });

  it("withholds a confidential name from every other admin", () => {
    expect(seesSupporterName(ADMIN, confidential)).toBe(false);
    expect(seesSupporterName(NARROW, confidential)).toBe(false);
    expect(seesSupporterName(PUBLIC_VIEWER, confidential)).toBe(false);
  });

  it("gives a confidential name to the role holder", () => {
    expect(seesSupporterName(OWNER, confidential)).toBe(true);
  });

  it("gives him his own name", () => {
    expect(seesSupporterName({ userId: "u1" }, confidential)).toBe(true);
    expect(seesSupporterName({ userId: "u9" }, confidential)).toBe(false);
  });

  it("leaves a giver who is not marked exactly as they were", () => {
    expect(seesSupporterName(ADMIN, ordinary)).toBe(true);
    expect(seesSupporterName(PUBLIC_VIEWER, ordinary)).toBe(true);
    expect(seesSupporterName(PUBLIC_VIEWER, typedIn)).toBe(true);
  });

  it("reads the mark off the account and nowhere else", () => {
    expect(nameIsConfidential(confidential)).toBe(true);
    expect(nameIsConfidential(ordinary)).toBe(false);
    expect(nameIsConfidential(typedIn)).toBe(false);
    expect(nameIsConfidential({ userId: "u1", user: {} })).toBe(false);
  });
});

describe("how much of a payment is support", () => {
  it("counts a donation whole", () => {
    expect(supportPart({ ...confidential, purpose: "DONATION", amount: 5000 })).toBe(5000);
  });

  it("counts only what a membership payment carries above the fee", () => {
    const payment = {
      ...confidential,
      purpose: "MEMBERSHIP",
      amount: MEMBERSHIP_FEE + 4900,
      feeApplied: MEMBERSHIP_FEE,
    };
    expect(supportPart(payment)).toBe(4900);
  });

  it("counts nothing on a membership payment that stops at the fee", () => {
    const payment = {
      ...confidential,
      purpose: "MEMBERSHIP",
      amount: MEMBERSHIP_FEE,
      feeApplied: MEMBERSHIP_FEE,
    };
    expect(supportPart(payment)).toBe(0);
  });
});

describe("which rows a viewer may see him on", () => {
  const fee = {
    ...confidential,
    purpose: "MEMBERSHIP",
    amount: MEMBERSHIP_FEE,
    feeApplied: MEMBERSHIP_FEE,
  };
  const feeAndSupport = {
    ...confidential,
    purpose: "MEMBERSHIP",
    amount: MEMBERSHIP_FEE + 4900,
    feeApplied: MEMBERSHIP_FEE,
  };

  it("leaves a membership fee alone, because that is ordinary admin business", () => {
    expect(seesPaymentIdentity(ADMIN, fee)).toBe(true);
  });

  it("hides the whole row when a membership payment carries a surplus", () => {
    expect(seesPaymentIdentity(ADMIN, feeAndSupport)).toBe(false);
    expect(seesPaymentIdentity(OWNER, feeAndSupport)).toBe(true);
  });
});

describe("taking the identity off a row", () => {
  it("leaves the field absent rather than empty", () => {
    const row = { ...confidential, donorName: "الكريم", amount: 5000 };

    const hidden = redactIdentity(ADMIN, row, ["donorName"]);

    expect("donorName" in hidden).toBe(false);
    expect(hidden.amount).toBe(5000);
  });

  it("hands the row back whole to a viewer who may see it", () => {
    const row = { ...confidential, donorName: "الكريم" };

    expect(redactIdentity(OWNER, row, ["donorName"])).toEqual(row);
  });

  it("keeps the amount when it takes the identity off a payment", () => {
    const payment = { ...confidential, purpose: "DONATION", amount: 5000, donorName: "الكريم" };

    const hidden = redactPaymentIdentity(ADMIN, payment, ["donorName"]);

    expect("donorName" in hidden).toBe(false);
    expect(hidden.amount).toBe(5000);
  });

  it("does not touch the row it was given", () => {
    const row = { ...confidential, donorName: "الكريم" };

    withoutFields(row, ["donorName"]);

    expect(row.donorName).toBe("الكريم");
  });
});
