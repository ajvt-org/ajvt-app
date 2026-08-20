import { describe, it, expect, beforeEach } from "vitest";
import { sharedResult, forgetShared } from "./sharedResult";

const TTL = 10_000;

beforeEach(() => {
  forgetShared();
});

describe("sharedResult", () => {
  it("computes once and hands the same answer back within the window", async () => {
    let runs = 0;
    const compute = async () => {
      runs++;
      return "board";
    };

    expect(await sharedResult("k", 1000, TTL, compute)).toBe("board");
    expect(await sharedResult("k", 5000, TTL, compute)).toBe("board");

    expect(runs).toBe(1);
  });

  it("computes once for callers that arrive together, which is the herd", async () => {
    let runs = 0;
    const compute = async () => {
      runs++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return runs;
    };

    const answers = await Promise.all(
      Array.from({ length: 50 }, () => sharedResult("k", 1000, TTL, compute)),
    );

    expect(runs).toBe(1);
    expect(new Set(answers)).toEqual(new Set([1]));
  });

  it("computes again once the window has passed", async () => {
    let runs = 0;
    const compute = async () => ++runs;

    await sharedResult("k", 1000, TTL, compute);
    await sharedResult("k", 1000 + TTL, TTL, compute);

    expect(runs).toBe(2);
  });

  it("keeps separate keys apart", async () => {
    let runs = 0;
    const compute = async () => ++runs;

    await sharedResult("a", 1000, TTL, compute);
    await sharedResult("b", 1000, TTL, compute);

    expect(runs).toBe(2);
  });

  it("holds on to nothing when the work fails, so the next caller retries", async () => {
    let runs = 0;
    const failing = async () => {
      runs++;
      throw new Error("no");
    };

    await expect(sharedResult("k", 1000, TTL, failing)).rejects.toThrow("no");
    await expect(sharedResult("k", 1000, TTL, failing)).rejects.toThrow("no");

    expect(runs).toBe(2);
  });

  it("hands the same failure to everyone waiting on it", async () => {
    let runs = 0;
    const failing = async () => {
      runs++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      throw new Error("no");
    };

    const settled = await Promise.allSettled(
      Array.from({ length: 10 }, () => sharedResult("k", 1000, TTL, failing)),
    );

    expect(runs).toBe(1);
    expect(settled.every((s) => s.status === "rejected")).toBe(true);
  });

  it("forgets everything when asked, so a test starts clean", async () => {
    let runs = 0;
    const compute = async () => ++runs;

    await sharedResult("k", 1000, TTL, compute);
    forgetShared();
    await sharedResult("k", 1000, TTL, compute);

    expect(runs).toBe(2);
  });
});
