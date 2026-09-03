import { describe, it, expect } from "vitest";
import { donorNamesShown } from "./donorNamesShown";

describe("the names a donation shows", () => {
  it("is the member's name alone once an account is linked", () => {
    expect(
      donorNamesShown({ memberName: "أبوبكر لمرابط", donorName: "ابو", userId: "u1" }),
    ).toEqual({ name: "أبوبكر لمرابط", typed: null });
  });

  it("keeps the typed name while no account is linked", () => {
    expect(donorNamesShown({ memberName: "متبرع مجهول", donorName: "ابو" })).toEqual({
      name: "متبرع مجهول",
      typed: "ابو",
    });
  });

  it("does not repeat a typed name that is already the one on show", () => {
    expect(donorNamesShown({ memberName: "أحمد", donorName: " أحمد " })).toEqual({
      name: "أحمد",
      typed: null,
    });
  });

  it("has no typed name when none was typed", () => {
    expect(donorNamesShown({ memberName: "متبرع مجهول", donorName: "   " })).toEqual({
      name: "متبرع مجهول",
      typed: null,
    });
    expect(donorNamesShown({ memberName: "متبرع مجهول", donorName: null })).toEqual({
      name: "متبرع مجهول",
      typed: null,
    });
    expect(donorNamesShown({ memberName: "متبرع مجهول" })).toEqual({
      name: "متبرع مجهول",
      typed: null,
    });
  });

  it("treats an empty account id as no account", () => {
    expect(donorNamesShown({ memberName: "متبرع مجهول", donorName: "ابو", userId: "" })).toEqual({
      name: "متبرع مجهول",
      typed: "ابو",
    });
  });
});
