import { describe, it, expect } from "vitest";
import { INITIALS_JOINER, nameInitials } from "./arabicName";

describe("nameInitials", () => {
  it("takes the opening letter of the first word and of the last", () => {
    expect(nameInitials("عبد الله ولد إبراهيم")).toBe("ع" + INITIALS_JOINER + "إ");
  });

  it("gives a single word one letter", () => {
    expect(nameInitials("إبراهيم")).toBe("إ");
  });

  it("reads the last word rather than the second", () => {
    expect(nameInitials("محمد ولد سيدي")).toBe("م" + INITIALS_JOINER + "س");
  });

  it("keeps the two letters from joining into a word", () => {
    expect(nameInitials("سيدي محمد")).toContain(INITIALS_JOINER);
  });

  it("ignores the spaces around and between the words", () => {
    expect(nameInitials("  أحمد   ولد   أحمد  ")).toBe("أ" + INITIALS_JOINER + "أ");
  });

  it("keeps the base letter and drops the mark riding on it", () => {
    expect(nameInitials("مُحمّد بَابا")).toBe("م" + INITIALS_JOINER + "ب");
  });

  it("has nothing to show for a name that is not there", () => {
    expect(nameInitials("")).toBe("");
    expect(nameInitials("   ")).toBe("");
  });
});
