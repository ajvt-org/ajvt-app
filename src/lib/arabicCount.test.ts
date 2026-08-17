import { describe, it, expect } from "vitest";
import { countCategory, counted, countedNoun, type CountedNoun } from "@/lib/arabicCount";

const AGE: CountedNoun = { one: "عصر", two: "عصران", few: "أعصار", many: "عصراً" };

describe("which form a number calls for", () => {
  it("counts one, two and the plural apart", () => {
    expect(countCategory(1)).toBe("one");
    expect(countCategory(2)).toBe("two");
  });

  it("takes the plural from three to ten", () => {
    for (const n of [3, 5, 10]) expect(countCategory(n), String(n)).toBe("few");
  });

  it("takes the singular from eleven to ninety nine", () => {
    for (const n of [11, 24, 99]) expect(countCategory(n), String(n)).toBe("many");
  });

  it("reads the last two digits, so a hundred and three counts as three", () => {
    expect(countCategory(103)).toBe("few");
    expect(countCategory(111)).toBe("many");
    expect(countCategory(1024)).toBe("many");
  });

  it("keeps a round hundred and a round thousand on their own form", () => {
    for (const n of [100, 101, 102, 200, 1000]) expect(countCategory(n), String(n)).toBe("other");
  });

  it("matches what the browser says for arabic", () => {
    const rules = new Intl.PluralRules("ar");
    for (let n = 0; n <= 250; n++) expect(countCategory(n), String(n)).toBe(rules.select(n));
  });
});

describe("the noun beside a number", () => {
  it("puts twenty four with the singular, which is the bug this fixes", () => {
    expect(countedNoun(24, AGE)).toBe("عصراً");
  });

  it("puts three to ten with the plural", () => {
    expect(countedNoun(5, AGE)).toBe("أعصار");
    expect(countedNoun(10, AGE)).toBe("أعصار");
  });

  it("uses the dual for two and the singular for one", () => {
    expect(countedNoun(1, AGE)).toBe("عصر");
    expect(countedNoun(2, AGE)).toBe("عصران");
  });

  it("uses the singular after a round hundred", () => {
    expect(countedNoun(100, AGE)).toBe("عصر");
  });

  it("uses the plural for none, which is how a screen says it", () => {
    expect(countedNoun(0, AGE)).toBe("أعصار");
  });
});

describe("a number and its noun together", () => {
  it("drops the digit where arabic carries the count in the word", () => {
    expect(counted(1, AGE)).toBe("عصر");
    expect(counted(2, AGE)).toBe("عصران");
  });

  it("keeps the digit everywhere else", () => {
    expect(counted(0, AGE)).toBe("0 أعصار");
    expect(counted(5, AGE)).toBe("5 أعصار");
    expect(counted(24, AGE)).toBe("24 عصراً");
    expect(counted(100, AGE)).toBe("100 عصر");
  });
});
