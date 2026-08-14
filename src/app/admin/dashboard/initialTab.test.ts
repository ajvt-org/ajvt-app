import { describe, it, expect } from "vitest";
import { initialFilterTab } from "./initialTab";

describe("initialFilterTab", () => {
  it("opens on the review queue when there is something to review", () => {
    expect(initialFilterTab([{ status: "ACTIVE" }, { status: "PENDING" }])).toBe("PENDING");
  });

  it("opens on the full list when nothing is pending", () => {
    expect(initialFilterTab([{ status: "ACTIVE" }, { status: "REJECTED" }])).toBe("ALL");
  });

  it("opens on the full list when there are no members at all", () => {
    expect(initialFilterTab([])).toBe("ALL");
  });
});
