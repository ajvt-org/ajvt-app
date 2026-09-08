import { describe, it, expect } from "vitest";
import { donationFormError } from "./donationFields";
import { money } from "./messages";

const FILLED = { donorName: "أبوبكر لمرابط", donorPhone: "", amount: "2000" };

describe("what a donation form refuses", () => {
  it("takes a donation whose giver is not known", () => {
    expect(donationFormError({ donorPhone: "", amount: "2000" })).toBe("");
  });

  it("takes a donation whose giver is named", () => {
    expect(donationFormError(FILLED)).toBe("");
  });

  it("refuses the display constant, which is a label and not a name", () => {
    expect(donationFormError({ ...FILLED, donorName: money.anonymousDonor })).toBe(
      money.nameIsThePlaceholder,
    );
  });

  it("refuses it around whatever spacing it was typed with", () => {
    expect(donationFormError({ ...FILLED, donorName: ` ${money.anonymousDonor} ` })).toBe(
      money.nameIsThePlaceholder,
    );
  });

  it("refuses a name that is only spaces", () => {
    expect(donationFormError({ ...FILLED, donorName: "   " })).toBe(money.nameRequired);
  });

  it("refuses a name longer than the column holds", () => {
    expect(donationFormError({ ...FILLED, donorName: "م".repeat(51) })).toBe(money.nameTooLong);
  });

  it("refuses an amount that is not a positive whole number", () => {
    expect(donationFormError({ ...FILLED, amount: "0" })).toBe(money.amountInvalid);
  });

  it("refuses a phone that is not one", () => {
    expect(donationFormError({ ...FILLED, donorPhone: "123" })).not.toBe("");
  });
});
