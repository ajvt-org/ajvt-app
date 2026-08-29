import { describe, it, expect } from "vitest";
import {
  isReceiptNumber,
  receiptDate,
  receiptFileName,
  receiptNumber,
  verifyPath,
} from "@/lib/officialReceipt";

describe("the receipt number", () => {
  it("pads the sequence so a book sorts in order", () => {
    expect(receiptNumber(2026, 1)).toBe("R-2026-0001");
    expect(receiptNumber(2026, 42)).toBe("R-2026-0042");
  });

  it("keeps growing past the fourth digit rather than wrapping", () => {
    expect(receiptNumber(2026, 12345)).toBe("R-2026-12345");
  });

  it("starts again at one in a new year, the way a paper book does", () => {
    expect(receiptNumber(2027, 1)).toBe("R-2027-0001");
  });

  it("recognises its own shape and nothing else", () => {
    expect(isReceiptNumber("R-2026-0001")).toBe(true);
    expect(isReceiptNumber("R-2026-12345")).toBe(true);
    expect(isReceiptNumber("AJVT-2026-0001")).toBe(false);
    expect(isReceiptNumber("R-26-1")).toBe(false);
    expect(isReceiptNumber("")).toBe(false);
  });
});

describe("the date as the form prints it", () => {
  it("reads day, month, year, spaced around the slashes", () => {
    expect(receiptDate(new Date(2026, 7, 24))).toBe("24 / 08 / 2026");
  });

  it("pads a single digit day and month", () => {
    expect(receiptDate(new Date(2026, 0, 5))).toBe("05 / 01 / 2026");
  });
});

describe("what the sheet is called and where its QR points", () => {
  it("names the file after the receipt", () => {
    expect(receiptFileName("R-2026-0001", "pdf")).toBe("وصل-R-2026-0001.pdf");
    expect(receiptFileName("R-2026-0001", "png")).toBe("وصل-R-2026-0001.png");
  });

  it("points the QR at the token, never at the number", () => {
    expect(verifyPath("abc123")).toBe("/verify/receipt/abc123");
    expect(verifyPath("abc123")).not.toContain("R-2026");
  });
});
