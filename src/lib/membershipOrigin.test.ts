import { describe, it, expect } from "vitest";
import { recordedByAdmin } from "./membershipOrigin";

const ADMINS = new Set(["boss", "amine"]);

const payment = (over: { recordedBy?: string | null; recordedByAdminId?: string | null } = {}) => ({
  recordedBy: null,
  recordedByAdminId: null,
  ...over,
});

describe("whether an admin recorded a membership", () => {
  it("takes the admin the payment names, whatever the live table says", () => {
    expect(recordedByAdmin(payment({ recordedByAdminId: "a1" }), new Set<string>())).toBe(true);
  });

  it("keeps saying yes once that admin's account is gone", () => {
    const gone = payment({ recordedBy: "boss", recordedByAdminId: "a1" });
    expect(recordedByAdmin(gone, new Set<string>())).toBe(true);
  });

  it("says yes when there is no payment at all, which only an admin path allows", () => {
    expect(recordedByAdmin(null, ADMINS)).toBe(true);
  });
});

describe("a membership recorded before the payment named an admin", () => {
  it("still reads an admin username off the payment", () => {
    expect(recordedByAdmin(payment({ recordedBy: "boss" }), ADMINS)).toBe(true);
  });

  it("does not read a member's own name as an admin", () => {
    expect(recordedByAdmin(payment({ recordedBy: "محمد ولد أحمد" }), ADMINS)).toBe(false);
  });

  it("says no when the payment does not say who recorded it", () => {
    expect(recordedByAdmin(payment(), ADMINS)).toBe(false);
  });

  it("says no when no admin answers to that name", () => {
    expect(recordedByAdmin(payment({ recordedBy: "boss" }), new Set<string>())).toBe(false);
  });
});
