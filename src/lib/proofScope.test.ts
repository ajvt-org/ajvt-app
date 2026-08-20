import { describe, it, expect } from "vitest";
import { proofScope } from "./proofScope";

describe("proofScope", () => {
  it("opens every kind to SUPER", () => {
    expect(proofScope("SUPER")).toEqual({ membership: true, activity: true, donations: true });
  });

  it("limits MEMBERS to membership proofs", () => {
    expect(proofScope("MEMBERS")).toEqual({ membership: true, activity: false, donations: false });
  });

  it("limits ACTIVITIES to activity proofs", () => {
    expect(proofScope("ACTIVITIES")).toEqual({
      membership: false,
      activity: true,
      donations: false,
    });
  });

  it("gives any other role nothing", () => {
    for (const role of ["QUIZ", "ACTIVITY", ""]) {
      expect(proofScope(role)).toEqual({ membership: false, activity: false, donations: false });
    }
  });
});
