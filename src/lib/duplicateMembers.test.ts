import { describe, it, expect } from "vitest";
import type { DuplicateMember } from "./duplicateMembers";
import { carriesRecords, planAccount } from "./duplicateMembers";

function member(over: Partial<DuplicateMember> = {}): DuplicateMember {
  return {
    id: "m1",
    status: "REJECTED",
    createdAt: new Date("2026-01-01"),
    memberNumber: null,
    registrations: 0,
    teamMemberships: 0,
    donations: 0,
    matchGoals: 0,
    matchBookings: 0,
    mvpCandidacies: 0,
    motmMatches: 0,
    ...over,
  };
}

describe("carriesRecords", () => {
  it("is false for a bare rejected form", () => {
    expect(carriesRecords(member())).toBe(false);
  });

  it("is true for anything the association would lose", () => {
    expect(carriesRecords(member({ memberNumber: "AJVT-1" }))).toBe(true);
    expect(carriesRecords(member({ registrations: 1 }))).toBe(true);
    expect(carriesRecords(member({ donations: 1 }))).toBe(true);
    expect(carriesRecords(member({ teamMemberships: 1 }))).toBe(true);
    expect(carriesRecords(member({ matchGoals: 1 }))).toBe(true);
    expect(carriesRecords(member({ matchBookings: 1 }))).toBe(true);
    expect(carriesRecords(member({ mvpCandidacies: 1 }))).toBe(true);
    expect(carriesRecords(member({ motmMatches: 1 }))).toBe(true);
  });
});

describe("planAccount", () => {
  it("leaves an account with one member alone", () => {
    expect(planAccount([member()])).toBeNull();
  });

  it("keeps the approved membership over the rejected duplicate", () => {
    const approved = member({ id: "approved", status: "ACTIVE", memberNumber: "AJVT-4" });
    const rejected = member({ id: "rejected", status: "REJECTED" });

    const plan = planAccount([rejected, approved])!;

    expect(plan.keep.id).toBe("approved");
    expect(plan.remove.map((m) => m.id)).toEqual(["rejected"]);
    expect(plan.detach).toEqual([]);
  });

  it("keeps pending over rejected", () => {
    const pending = member({ id: "pending", status: "PENDING" });
    const rejected = member({ id: "rejected", status: "REJECTED" });

    expect(planAccount([rejected, pending])!.keep.id).toBe("pending");
  });

  it("prefers the one carrying records when the status is the same", () => {
    const bare = member({ id: "bare", status: "ACTIVE", createdAt: new Date("2026-03-01") });
    const carrying = member({
      id: "carrying",
      status: "ACTIVE",
      registrations: 2,
      createdAt: new Date("2026-01-01"),
    });

    const plan = planAccount([bare, carrying])!;

    expect(plan.keep.id).toBe("carrying");
    expect(plan.remove.map((m) => m.id)).toEqual(["bare"]);
  });

  it("keeps the most recent when nothing else separates them", () => {
    const old = member({ id: "old", createdAt: new Date("2026-01-01") });
    const recent = member({ id: "recent", createdAt: new Date("2026-06-01") });

    expect(planAccount([old, recent])!.keep.id).toBe("recent");
  });

  it("detaches a loser that carries records instead of deleting it", () => {
    const approved = member({ id: "approved", status: "ACTIVE", memberNumber: "AJVT-4" });
    const registered = member({ id: "registered", status: "PENDING", registrations: 1 });
    const bare = member({ id: "bare", status: "REJECTED" });

    const plan = planAccount([approved, registered, bare])!;

    expect(plan.keep.id).toBe("approved");
    expect(plan.detach.map((m) => m.id)).toEqual(["registered"]);
    expect(plan.remove.map((m) => m.id)).toEqual(["bare"]);
  });
});
