import { describe, it, expect } from "vitest";
import { recordedByAdmin } from "./membershipOrigin";

const ADMINS = new Set(["boss", "amine"]);

describe("whether an admin recorded a membership", () => {
  it("reads an admin username off the payment", () => {
    expect(recordedByAdmin({ recordedBy: "boss" }, ADMINS)).toBe(true);
  });

  it("does not read a member's own name as an admin", () => {
    expect(recordedByAdmin({ recordedBy: "محمد ولد أحمد" }, ADMINS)).toBe(false);
  });

  it("says yes when there is no payment at all, which only an admin path allows", () => {
    expect(recordedByAdmin(null, ADMINS)).toBe(true);
  });

  it("says no when the payment does not say who recorded it", () => {
    expect(recordedByAdmin({ recordedBy: null }, ADMINS)).toBe(false);
  });

  it("says no when no admin answers to that name", () => {
    expect(recordedByAdmin({ recordedBy: "boss" }, new Set<string>())).toBe(false);
  });
});
