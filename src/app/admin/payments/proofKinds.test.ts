import { describe, it, expect } from "vitest";
import { HISTORY_TARGETS } from "@/app/api/admin/history/schema";
import { HISTORY_TARGET, REUSE_KIND } from "./proofKinds";

describe("the audit trail a payment row opens", () => {
  it("reads a membership row against the member, which is what the trail records", () => {
    expect(HISTORY_TARGET.MEMBERSHIP).toBe("Member");
  });

  it("reads an activity row against its registration", () => {
    expect(HISTORY_TARGET.ACTIVITY).toBe("ActivityRegistration");
  });

  it("reads a donation row against the donation", () => {
    expect(HISTORY_TARGET.DONATION).toBe("Donation");
  });

  it("maps every kind to a target the route will accept", () => {
    for (const target of Object.values(HISTORY_TARGET)) {
      expect(HISTORY_TARGETS as readonly string[]).toContain(target);
    }
  });
});

describe("the record a reused screenshot is checked against", () => {
  it("checks a membership row as the member it belongs to", () => {
    expect(REUSE_KIND.MEMBERSHIP).toBe("member");
  });

  it("checks a donation row as the donation itself", () => {
    expect(REUSE_KIND.DONATION).toBe("donation");
  });

  it("leaves an activity registration out, since the check does not look at those", () => {
    expect(REUSE_KIND.ACTIVITY).toBeUndefined();
  });
});
