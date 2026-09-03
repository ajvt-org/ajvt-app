import { describe, it, expect } from "vitest";
import { amountInWords } from "@/lib/arabicAmount";
import { numberToArabicWords } from "@/lib/arabicNumberWords";
import { ouguiya } from "@/lib/texts/currency";

const TABLE: [number, string][] = [
  [1, "أوقية واحدة"],
  [2, "أوقيتان"],
  [3, "ثلاث أوقيات"],
  [8, "ثماني أوقيات"],
  [10, "عشر أوقيات"],
  [11, "إحدى عشرة أوقية"],
  [12, "اثنتا عشرة أوقية"],
  [13, "ثلاث عشرة أوقية"],
  [19, "تسع عشرة أوقية"],
  [20, "عشرون أوقية"],
  [21, "إحدى وعشرون أوقية"],
  [22, "اثنتان وعشرون أوقية"],
  [23, "ثلاث وعشرون أوقية"],
  [99, "تسع وتسعون أوقية"],
  [100, "مائة أوقية"],
  [101, "مائة وواحدة أوقية"],
  [103, "مائة وثلاث أوقيات"],
  [111, "مائة وإحدى عشرة أوقية"],
  [200, "مائتا أوقية"],
  [203, "مائتان وثلاث أوقيات"],
  [300, "ثلاثمائة أوقية"],
  [500, "خمسمائة أوقية"],
  [800, "ثمانمائة أوقية"],
  [999, "تسعمائة وتسع وتسعون أوقية"],
  [1000, "ألف أوقية"],
  [1500, "ألف وخمسمائة أوقية"],
  [2000, "ألفا أوقية"],
  [2023, "ألفان وثلاث وعشرون أوقية"],
  [3000, "ثلاثة آلاف أوقية"],
  [5000, "خمسة آلاف أوقية"],
  [10000, "عشرة آلاف أوقية"],
  [11000, "أحد عشر ألف أوقية"],
  [50000, "خمسون ألف أوقية"],
  [100000, "مائة ألف أوقية"],
  [200000, "مائتا ألف أوقية"],
  [103000, "مائة وثلاثة آلاف أوقية"],
  [1000000, "مليون أوقية"],
  [2000000, "مليونا أوقية"],
  [11023, "أحد عشر ألفاً وثلاث وعشرون أوقية"],
];

describe("the amount as the receipt spells it", () => {
  for (const [amount, words] of TABLE) {
    it(`writes ${amount}`, () => {
      expect(amountInWords(amount)).toBe(words);
    });
  }

  it("writes the uploaded receipt exactly", () => {
    expect(amountInWords(5000)).toBe("خمسة آلاف أوقية");
  });
});

describe("the gender of the counted noun decides the numeral", () => {
  it("drops the taa marbuta before a feminine noun and keeps it before a masculine one", () => {
    expect(numberToArabicWords(5, "f")).toBe("خمس");
    expect(numberToArabicWords(5, "m")).toBe("خمسة");
  });

  it("flips again inside the same amount, because ألف is masculine", () => {
    expect(amountInWords(5000)).toContain("خمسة آلاف");
    expect(amountInWords(5)).toContain("خمس أوقيات");
  });

  it("agrees on both halves of eleven and twelve, and disagrees from thirteen up", () => {
    expect(numberToArabicWords(11, "f")).toBe("إحدى عشرة");
    expect(numberToArabicWords(11, "m")).toBe("أحد عشر");
    expect(numberToArabicWords(13, "f")).toBe("ثلاث عشرة");
    expect(numberToArabicWords(13, "m")).toBe("ثلاثة عشر");
  });
});

describe("the last two digits decide the noun", () => {
  it("takes the plural only from three to ten", () => {
    for (const n of [3, 10, 103, 1003, 5010]) {
      expect(amountInWords(n), String(n)).toContain("أوقيات");
    }
  });

  it("returns to the singular everywhere else", () => {
    for (const n of [11, 20, 99, 100, 101, 1000, 1100, 5000]) {
      expect(amountInWords(n), String(n)).toMatch(/أوقية$/);
    }
  });

  it("binds the dual hundred and the dual thousand only when the noun follows them", () => {
    expect(amountInWords(200)).toContain("مائتا");
    expect(amountInWords(203)).toContain("مائتان");
    expect(amountInWords(2000)).toContain("ألفا");
    expect(amountInWords(2023)).toContain("ألفان");
  });
});

describe("amounts outside what a receipt can carry", () => {
  it("spells zero rather than leaving the line blank", () => {
    expect(amountInWords(0)).toBe("صفر أوقية");
  });

  it("returns nothing for a negative, a fraction or an absurd amount", () => {
    expect(amountInWords(-1)).toBe("");
    expect(amountInWords(1.5)).toBe("");
    expect(amountInWords(1e15)).toBe("");
  });

  it("never leaves a bare numeral, whatever the amount", () => {
    for (let n = 0; n <= 2000; n++) expect(amountInWords(n), String(n)).toMatch(/أوقي/);
  });
});

describe("ouguiya.amount", () => {
  it("formats a number below 1000 without a separator", () => {
    expect(ouguiya.amount(500)).toBe("500 أوقية");
  });

  it("separates thousands with a dot", () => {
    expect(ouguiya.amount(5000)).toBe("5.000 أوقية");
    expect(ouguiya.amount(1000000)).toBe("1.000.000 أوقية");
  });

  it("places the currency word after the digits", () => {
    expect(ouguiya.amount(100)).toMatch(/أوقية$/);
  });

  it("keeps the sign on a negative amount", () => {
    expect(ouguiya.amount(-1500)).toBe("-1.500 أوقية");
  });
});
