import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { HISTORY_TARGETS } from "@/app/api/admin/history/schema";

const CARD = readFileSync("src/app/admin/payments/ProofCard.tsx", "utf8");

function mappedTarget(kind: string): string {
  return CARD.match(new RegExp(`${kind}: "([A-Za-z]+)"`))?.[1] ?? "";
}

describe("the audit trail a payment row opens", () => {
  it("reads a membership row against the member, which is what the trail records", () => {
    expect(mappedTarget("MEMBERSHIP")).toBe("Member");
  });

  it("reads an activity row against its registration", () => {
    expect(mappedTarget("ACTIVITY")).toBe("ActivityRegistration");
  });

  it("reads a donation row against the donation", () => {
    expect(mappedTarget("DONATION")).toBe("Donation");
  });

  it("maps every kind to a target the route will accept", () => {
    for (const kind of ["MEMBERSHIP", "ACTIVITY", "DONATION"]) {
      expect(HISTORY_TARGETS as readonly string[], kind).toContain(mappedTarget(kind));
    }
  });
});
