import { describe, it, expect } from "vitest";
import { foldArabic, matchesSearch, searchKey, searchTokens } from "./arabicText";

const TYPO = "ابو";
const ACCOUNT = "أبوبكر لمرابط";

describe("folding Arabic for comparison", () => {
  it("reads every alef the same way", () => {
    expect(foldArabic("أإآٱا")).toBe("ااااا");
  });

  it("reads ة as ه and ى as ي", () => {
    expect(foldArabic("فاطمة")).toBe("فاطمه");
    expect(foldArabic("موسى")).toBe("موسي");
  });

  it("drops tashkeel and tatweel", () => {
    expect(foldArabic("مُحَمَّد")).toBe("محمد");
    expect(foldArabic("محـــمد")).toBe("محمد");
  });
});

describe("searching by name", () => {
  it("finds the account the admin was typing towards", () => {
    expect(matchesSearch(ACCOUNT, searchTokens(TYPO))).toBe(true);
  });

  it("is what a bare substring match could not do", () => {
    expect(ACCOUNT.includes(TYPO)).toBe(false);
  });

  it("keeps the words apart, so a search can span them", () => {
    expect(searchKey(ACCOUNT)).toBe("ابوبكر لمرابط");
  });

  it("matches on any word, in any order", () => {
    expect(matchesSearch(ACCOUNT, searchTokens("لمرابط ابوبكر"))).toBe(true);
  });

  it("matches a membership number however it is punctuated", () => {
    expect(matchesSearch("AJVT-2026-0061", searchTokens("0061"))).toBe(true);
    expect(matchesSearch("AJVT-2026-0061", searchTokens("ajvt 2026"))).toBe(true);
  });

  it("tells apart two people who share a name, by number", () => {
    const first = "الداه الحسن AJVT-2026-0061 33655124";
    const second = "الداه الحسن AJVT-2026-0062 43191466";
    const tokens = searchTokens("الداه 0062");

    expect(matchesSearch(first, tokens)).toBe(false);
    expect(matchesSearch(second, tokens)).toBe(true);
  });

  it("matches everything on an empty search", () => {
    expect(matchesSearch(ACCOUNT, searchTokens("   "))).toBe(true);
  });
});
