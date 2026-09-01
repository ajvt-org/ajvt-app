import { describe, it, expect } from "vitest";
import { personDetails } from "./personDetails";

describe("personDetails", () => {
  it("joins the phone, the village and the age in that order", () => {
    expect(personDetails({ phone: "36000001", village: "التاكلالت", age: "أشبال" })).toBe(
      "36000001 · التاكلالت · أشبال",
    );
  });

  it("drops the age when there is none", () => {
    expect(personDetails({ phone: "36000001", village: "نواكشوط", age: null })).toBe(
      "36000001 · نواكشوط",
    );
  });

  it("drops the phone when there is none", () => {
    expect(personDetails({ phone: null, village: "التاكلالت", age: "أشبال" })).toBe(
      "التاكلالت · أشبال",
    );
  });

  it("leaves no separator behind when only the village is known", () => {
    expect(personDetails({ phone: null, village: "نواكشوط", age: null })).toBe("نواكشوط");
  });

  it("treats an empty string as absent", () => {
    expect(personDetails({ phone: "", village: "نواكشوط", age: "" })).toBe("نواكشوط");
  });
});
