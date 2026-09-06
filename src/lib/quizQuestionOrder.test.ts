import { describe, it, expect } from "vitest";
import { isMoveDirection, moveInOrder } from "./quizQuestionOrder";

const ids = ["a", "b", "c"];

describe("moveInOrder", () => {
  it("swaps a question with the one before it", () => {
    expect(moveInOrder(ids, "b", "up")).toEqual(["b", "a", "c"]);
  });

  it("swaps a question with the one after it", () => {
    expect(moveInOrder(ids, "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("leaves the first question where it is", () => {
    expect(moveInOrder(ids, "a", "up")).toEqual(ids);
  });

  it("leaves the last question where it is", () => {
    expect(moveInOrder(ids, "c", "down")).toEqual(ids);
  });

  it("leaves the list alone when the question is not in it", () => {
    expect(moveInOrder(ids, "z", "up")).toEqual(ids);
  });

  it("does not change the list it was given", () => {
    const original = [...ids];
    moveInOrder(original, "b", "up");
    expect(original).toEqual(ids);
  });
});

describe("isMoveDirection", () => {
  it("accepts the two directions", () => {
    expect(isMoveDirection("up")).toBe(true);
    expect(isMoveDirection("down")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isMoveDirection("sideways")).toBe(false);
    expect(isMoveDirection(1)).toBe(false);
    expect(isMoveDirection(undefined)).toBe(false);
  });
});
