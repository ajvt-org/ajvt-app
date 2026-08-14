import { describe, it, expect } from "vitest";
import { parse } from "@/lib/validation";
import { quizAnswerSchema } from "./schema";
import { rejectionOf } from "@tests/schema";

describe("quizAnswerSchema", () => {
  it("accepts an assignment and a list of answers", () => {
    expect(parse(quizAnswerSchema, { assignmentId: "a1", selectedAnswerIds: ["x", "y"] })).toEqual({
      assignmentId: "a1",
      selectedAnswerIds: ["x", "y"],
    });
  });

  it("accepts an empty list, which the route rejects with its own message", () => {
    expect(parse(quizAnswerSchema, { assignmentId: "a1", selectedAnswerIds: [] })).toEqual({
      assignmentId: "a1",
      selectedAnswerIds: [],
    });
  });

  it("rejects a missing assignment", () => {
    expect(rejectionOf(quizAnswerSchema, { selectedAnswerIds: [] })).toBe("بيانات غير صالحة");
  });

  it("rejects an empty assignment id", () => {
    expect(rejectionOf(quizAnswerSchema, { assignmentId: "", selectedAnswerIds: [] })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("rejects an assignment id that is not a string", () => {
    expect(rejectionOf(quizAnswerSchema, { assignmentId: 7, selectedAnswerIds: [] })).toBe(
      "بيانات غير صالحة",
    );
  });

  it("rejects answers that are not a list", () => {
    expect(rejectionOf(quizAnswerSchema, { assignmentId: "a1", selectedAnswerIds: "x" })).toBe(
      "يجب اختيار إجابة واحدة على الأقل",
    );
  });

  it("rejects a list holding something other than ids", () => {
    expect(rejectionOf(quizAnswerSchema, { assignmentId: "a1", selectedAnswerIds: ["x", 3] })).toBe(
      "يجب اختيار إجابة واحدة على الأقل",
    );
  });
});
