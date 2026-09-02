import { describe, it, expect } from "vitest";
import { logLabelFor, logSnapshotFor } from "./auditSupport";

const open = { userId: "u1", user: { supportNameConfidential: false } };
const closed = { userId: "u2", user: { supportNameConfidential: true } };

describe("what an entry keeps about a supporter", () => {
  it("keeps the label for a giver who is not marked", () => {
    expect(logLabelFor(open, "أحمد — 5000")).toBe("أحمد — 5000");
  });

  it("drops the label for a marked giver rather than writing a name", () => {
    expect(logLabelFor(closed, "الكريم — 5000")).toBeUndefined();
  });

  it("keeps a stored row whole for a giver who is not marked", () => {
    const row = { donorName: "أحمد", amount: 5000 };

    expect(logSnapshotFor(open, row)).toEqual(row);
  });

  it("takes every identifying field out of a marked giver's stored row", () => {
    const row = {
      donorName: "الكريم",
      donorPhone: "44001122",
      donorPhoto: "face.webp",
      proof: "slip.webp",
      amount: 5000,
      status: "ACTIVE",
    };

    expect(logSnapshotFor(closed, row)).toEqual({ amount: 5000, status: "ACTIVE" });
  });

  it("reaches a name nested inside a stored row", () => {
    const row = { payment: { user: { fullName: "الكريم" }, amount: 5000 } };

    expect(logSnapshotFor(closed, row)).toEqual({ payment: { user: {}, amount: 5000 } });
  });

  it("leaves a stored row that carries no identity alone", () => {
    expect(logSnapshotFor(closed, { amount: 5000 })).toEqual({ amount: 5000 });
  });

  it("passes a value that is not a row straight through", () => {
    expect(logSnapshotFor(closed, undefined)).toBeUndefined();
    expect(logSnapshotFor(closed, 5000)).toBe(5000);
  });
});
