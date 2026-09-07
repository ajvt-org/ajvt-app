import { describe, it, expect } from "vitest";
import { bulkReview } from "./reviewQueue";
import { moveAgeGroup } from "./ageGroups";

describe("what a bulk action asks and reports", () => {
  it("counts the selection in every question it asks", () => {
    expect(bulkReview.approve(3)).toContain("3");
    expect(bulkReview.refuse(4, "إثبات غير واضح")).toContain("4");
    expect(bulkReview.move(5, "الرواد")).toContain("5");
  });

  it("names the reason in the refusal and the age group in the move", () => {
    expect(bulkReview.refuse(1, "إثبات غير واضح")).toContain("إثبات غير واضح");
    expect(bulkReview.move(1, "الرواد")).toContain("الرواد");
  });

  it("counts what did not go through", () => {
    expect(bulkReview.someFailed(2)).toContain("2");
    expect(bulkReview.someNotMoved(7)).toContain("7");
  });

  it("keeps a partial failure apart from a run that failed outright", () => {
    expect(bulkReview.someFailed(2)).not.toBe(bulkReview.failed);
  });
});

describe("moving the members of one age group to another", () => {
  it("names both groups in the question", () => {
    expect(moveAgeGroup.confirmMove("الرواد", "البدريين")).toContain("الرواد");
    expect(moveAgeGroup.confirmMove("الرواد", "البدريين")).toContain("البدريين");
  });

  it("says how many are being moved", () => {
    expect(moveAgeGroup.intro("4 أعضاء")).toContain("4 أعضاء");
  });
});
