import { describe, it, expect } from "vitest";
import { awaitsReview, nextAwaitingReview, type QueueRow } from "./reviewQueue";

function row(id: string, status: QueueRow["status"]): QueueRow {
  return { id, status };
}

describe("a row that is waiting on a verdict", () => {
  it("is one whose payment has not been judged", () => {
    expect(awaitsReview(row("m1", "PENDING"))).toBe(true);
  });

  it("is not one already accepted", () => {
    expect(awaitsReview(row("m1", "ACTIVE"))).toBe(false);
  });

  it("is not one already refused", () => {
    expect(awaitsReview(row("m1", "REJECTED"))).toBe(false);
  });
});

describe("stepping through the queue", () => {
  const mixed = [
    row("a", "PENDING"),
    row("b", "ACTIVE"),
    row("c", "REJECTED"),
    row("d", "PENDING"),
    row("e", "ACTIVE"),
  ];

  it("passes over the judged rows between two waiting ones", () => {
    expect(nextAwaitingReview(mixed, "a", 1)?.id).toBe("d");
  });

  it("passes over them going back as well", () => {
    expect(nextAwaitingReview(mixed, "d", -1)?.id).toBe("a");
  });

  it("stops at the end rather than wrapping to the start", () => {
    expect(nextAwaitingReview(mixed, "d", 1)).toBeNull();
  });

  it("stops at the start rather than wrapping to the end", () => {
    expect(nextAwaitingReview(mixed, "a", -1)).toBeNull();
  });

  it("steps from a row that is itself judged, which the verdict handler needs", () => {
    expect(nextAwaitingReview(mixed, "b", 1)?.id).toBe("d");
  });

  it("never answers with the row it started from", () => {
    expect(nextAwaitingReview([row("a", "PENDING")], "a", 1)).toBeNull();
  });

  it("answers with nothing when the row has left the page", () => {
    expect(nextAwaitingReview(mixed, "gone", 1)).toBeNull();
  });

  it("walks a page of waiting rows one at a time", () => {
    const waiting = [row("a", "PENDING"), row("b", "PENDING"), row("c", "PENDING")];
    expect(nextAwaitingReview(waiting, "a", 1)?.id).toBe("b");
    expect(nextAwaitingReview(waiting, "b", 1)?.id).toBe("c");
  });
});
