import { describe, it, expect } from "vitest";
import { nameKey } from "./nameKey";

describe("nameKey", () => {
  it("folds the hamza forms onto a bare alef", () => {
    expect(nameKey("أحمد ولد سالم")).toBe(nameKey("احمد ولد سالم"));
    expect(nameKey("إبراهيم")).toBe(nameKey("ابراهيم"));
  });

  it("ignores the patronymic marker", () => {
    expect(nameKey("مراد ولد وجاه")).toBe(nameKey("مراد وجاه"));
    expect(nameKey("فاطمة بنت أحمد")).toBe(nameKey("فاطمة أحمد"));
  });

  it("ignores spacing and trailing whitespace", () => {
    expect(nameKey("  مراد   وجاه ")).toBe(nameKey("مراد وجاه"));
  });

  it("treats ة and ه, ى and ي as the same letter", () => {
    expect(nameKey("فاطمة")).toBe(nameKey("فاطمه"));
    expect(nameKey("يحيى")).toBe(nameKey("يحيي"));
  });

  it("drops diacritics and tatweel", () => {
    expect(nameKey("مُحَمَّد")).toBe(nameKey("محمد"));
    expect(nameKey("محـــمد")).toBe(nameKey("محمد"));
  });

  it("keeps different people apart", () => {
    expect(nameKey("سيدي محمد")).not.toBe(nameKey("سيد محمد"));
    expect(nameKey("الشيخ التجاني عارف")).not.toBe(nameKey("يسلم عارف"));
    expect(nameKey("محمد الأمين")).not.toBe(nameKey("محمد"));
  });

  it("is empty for a name of nothing but a patronymic or punctuation", () => {
    expect(nameKey("ولد")).toBe("");
    expect(nameKey("...")).toBe("");
  });
});
