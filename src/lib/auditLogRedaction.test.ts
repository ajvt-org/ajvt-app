import { describe, it, expect } from "vitest";
import { scrubNames } from "./auditLogRedaction";
import { money } from "./messages";

const GIVER = "الكريم ولد الساتر";

describe("reading the action log without a confidential name", () => {
  it("hands the entry back untouched when no name is confidential", () => {
    const entry = { targetLabel: GIVER, before: { donorName: GIVER } };

    expect(scrubNames(entry, [])).toBe(entry);
  });

  it("hands the entry back untouched when it names nobody confidential", () => {
    const entry = { targetLabel: "أحمد" };

    expect(scrubNames(entry, [GIVER])).toBe(entry);
  });

  it("takes the name out of the label", () => {
    const entry = { targetLabel: `${GIVER} — 5000` };

    expect(scrubNames(entry, [GIVER]).targetLabel).toBe(`${money.anonymousDonor} — 5000`);
  });

  it("takes the name out of a stored row without dropping the row", () => {
    const entry = { targetLabel: null, before: { donorName: GIVER, amount: 5000 } };

    const scrubbed = scrubNames(entry, [GIVER]);

    expect(scrubbed.before).toEqual({ donorName: money.anonymousDonor, amount: 5000 });
  });

  it("takes every occurrence, not only the first", () => {
    const entry = { targetLabel: `${GIVER} → ${GIVER}` };

    expect(scrubNames(entry, [GIVER]).targetLabel).not.toContain(GIVER);
  });

  it("does not touch the entry it was given", () => {
    const entry = { targetLabel: GIVER };

    scrubNames(entry, [GIVER]);

    expect(entry.targetLabel).toBe(GIVER);
  });
});
