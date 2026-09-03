import { describe, it, expect } from "vitest";
import { pendingCount, registeredCount } from "./activitiesList";

describe("what a row counts", () => {
  const registrations = (...statuses: string[]) => ({
    registrations: statuses.map((status) => ({ status })),
  });

  it("counts everyone who was not turned away", () => {
    expect(registeredCount(registrations("ACTIVE", "PENDING", "REJECTED"))).toBe(2);
  });

  it("counts only what is still waiting as pending", () => {
    expect(pendingCount(registrations("ACTIVE", "PENDING", "PENDING"))).toBe(2);
  });

  it("counts nothing on an activity nobody asked for", () => {
    expect(registeredCount(registrations())).toBe(0);
    expect(pendingCount(registrations())).toBe(0);
  });
});
