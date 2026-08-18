import { describe, it, expect } from "vitest";
import { validateDonorChoice, donorNameFor, DONOR_NAME_MAX } from "./donorChoice";
import { money } from "./messages/money";

describe("validateDonorChoice", () => {
  it("refuses a donor who never answered the question", () => {
    expect(validateDonorChoice(null, "")).toBe(money.nameChoiceRequired);
    expect(validateDonorChoice(null, "محمد")).toBe(money.nameChoiceRequired);
  });

  it("accepts a donor who chose to stay anonymous", () => {
    expect(validateDonorChoice(true, "")).toBeNull();
  });

  it("refuses a donor who asked to be named but left the name empty", () => {
    expect(validateDonorChoice(false, "")).toBe(money.nameRequired);
    expect(validateDonorChoice(false, "   ")).toBe(money.nameRequired);
  });

  it("accepts a donor who asked to be named and gave one", () => {
    expect(validateDonorChoice(false, "محمد ولد أحمد")).toBeNull();
  });

  it("refuses a name longer than the board can carry", () => {
    expect(validateDonorChoice(false, "م".repeat(DONOR_NAME_MAX + 1))).toBe(money.nameTooLong);
    expect(validateDonorChoice(false, "م".repeat(DONOR_NAME_MAX))).toBeNull();
  });
});

describe("donorNameFor", () => {
  it("drops the name when the donor asked to stay anonymous", () => {
    expect(donorNameFor(true, "محمد")).toBeNull();
  });

  it("keeps the trimmed name otherwise", () => {
    expect(donorNameFor(false, "  محمد  ")).toBe("محمد");
  });

  it("treats a blank name as no name at all", () => {
    expect(donorNameFor(false, "   ")).toBeNull();
  });
});
