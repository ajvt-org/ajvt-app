import { describe, it, expect } from "vitest";
import {
  ADMIN_ORIGIN,
  SELF_ORIGIN,
  UNKNOWN_ORIGIN,
  membershipOrigin,
  recordingAdminIds,
} from "./membershipOrigin";

const ADMINS = new Set(["boss", "amine"]);

const payment = (over: { recordedBy?: string | null; recordedByAdminId?: string | null } = {}) => ({
  recordedBy: null,
  recordedByAdminId: null,
  ...over,
});

describe("a membership an admin is stamped on", () => {
  it("takes the admin the payment names, whatever the live table says", () => {
    expect(membershipOrigin(payment({ recordedByAdminId: "a1" }), new Set<string>())).toBe(
      ADMIN_ORIGIN,
    );
  });

  it("stays an admin membership once that admin's account is gone", () => {
    const gone = payment({ recordedBy: "boss", recordedByAdminId: "a1" });
    expect(membershipOrigin(gone, new Set<string>())).toBe(ADMIN_ORIGIN);
  });

  it("still reads an admin username off a payment written before the id existed", () => {
    expect(membershipOrigin(payment({ recordedBy: "boss" }), ADMINS)).toBe(ADMIN_ORIGIN);
  });
});

describe("a membership the member recorded", () => {
  it("does not read a member's own name as an admin", () => {
    expect(membershipOrigin(payment({ recordedBy: "محمد ولد أحمد" }), ADMINS)).toBe(SELF_ORIGIN);
  });

  it("reads a name no admin answers to as the member", () => {
    expect(membershipOrigin(payment({ recordedBy: "boss" }), new Set<string>())).toBe(SELF_ORIGIN);
  });
});

describe("a membership nothing recorded an origin for", () => {
  it("is unknown when the payment names nobody", () => {
    expect(membershipOrigin(payment(), ADMINS)).toBe(UNKNOWN_ORIGIN);
  });

  it("is unknown when there is no payment to carry a recorder", () => {
    expect(membershipOrigin(null, ADMINS)).toBe(UNKNOWN_ORIGIN);
  });
});

describe("which admins a list of memberships was recorded by", () => {
  it("names each one once", () => {
    const rows = [
      { recordedByAdminId: "a1" },
      { recordedByAdminId: "a2" },
      { recordedByAdminId: "a1" },
    ];
    expect(recordingAdminIds(rows)).toEqual(["a1", "a2"]);
  });

  it("names nobody for memberships no admin id was written onto", () => {
    expect(recordingAdminIds([{ recordedByAdminId: null }, { recordedByAdminId: null }])).toEqual(
      [],
    );
  });
});
