import { describe, it, expect } from "vitest";
import { QUIZ_FILTER_KEYS, readQuizFilters, writeQuizFilters } from "./quizFilters";

describe("carrying the quiz search in the address", () => {
  it("reads an empty query as no search at all", () => {
    expect(readQuizFilters(new URLSearchParams())).toEqual({ q: "" });
  });

  it("writes nothing for the default view", () => {
    expect(writeQuizFilters({ q: "" }).toString()).toBe("");
  });

  it("survives a round trip, which is what a shared link is", () => {
    const chosen = { q: "capital" };
    expect(readQuizFilters(new URLSearchParams(writeQuizFilters(chosen).toString()))).toEqual(
      chosen,
    );
  });

  it("trims whitespace-only search out of the address", () => {
    expect(writeQuizFilters({ q: "   " }).toString()).toBe("");
  });

  it("lists exactly the key it owns in the address", () => {
    expect(QUIZ_FILTER_KEYS).toEqual(["q"]);
  });
});
