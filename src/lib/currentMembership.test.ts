import { describe, it, expect } from "vitest";
import { latestMembership, latestByAccount, asMembershipState } from "./currentMembership";

const row = (year: number, over: Record<string, unknown> = {}) => ({
  userId: "u1",
  year,
  status: "ACTIVE" as const,
  ...over,
});

describe("latestMembership", () => {
  it("takes the newest year the account has", () => {
    expect(latestMembership([row(2024), row(2026), row(2025)])?.year).toBe(2026);
  });

  it("reads the same whichever order the rows arrive in", () => {
    expect(latestMembership([row(2026), row(2024)])?.year).toBe(2026);
  });

  it("has nothing for an account that never joined", () => {
    expect(latestMembership([])).toBeNull();
  });

  it("keeps a refused year when it is the only one", () => {
    const rows = [row(2026, { status: "REJECTED" as const })];

    expect(latestMembership(rows)?.status).toBe("REJECTED");
  });

  it("prefers the newer year even when an older one was accepted", () => {
    const rows = [row(2025), row(2026, { status: "PENDING" as const })];

    expect(latestMembership(rows)?.status).toBe("PENDING");
  });
});

describe("latestByAccount", () => {
  it("keeps one row per account", () => {
    const rows = [row(2025), row(2026), row(2026, { userId: "u2" })];

    const latest = latestByAccount(rows);

    expect(latest.size).toBe(2);
    expect(latest.get("u1")?.year).toBe(2026);
    expect(latest.get("u2")?.year).toBe(2026);
  });

  it("holds nothing for an account with no row", () => {
    expect(latestByAccount([row(2026)]).get("u9")).toBeUndefined();
  });

  it("has nothing to keep when there are no rows", () => {
    expect(latestByAccount([]).size).toBe(0);
  });
});

describe("asMembershipState", () => {
  it("names the year the way the state model reads it", () => {
    expect(asMembershipState(row(2026))).toEqual({ status: "ACTIVE", membershipYear: 2026 });
  });

  it("passes an account with no membership straight through", () => {
    expect(asMembershipState(null)).toBeNull();
  });

  it("keeps the status a year was left in", () => {
    expect(asMembershipState(row(2025, { status: "PENDING" as const }))).toEqual({
      status: "PENDING",
      membershipYear: 2025,
    });
  });
});
