import { describe, it, expect } from "vitest";
import { columnFor, mapHeaders, normalizeHeader } from "./memberImportColumns";

describe("normalizeHeader", () => {
  it("drops a byte order mark left by Excel", () => {
    expect(normalizeHeader("﻿الاسم الكامل")).toBe("الاسم الكامل");
  });

  it("folds the alef and taa marbuta spellings together", () => {
    expect(normalizeHeader("القريه")).toBe(normalizeHeader("القرية"));
    expect(normalizeHeader("الأسم")).toBe(normalizeHeader("الاسم"));
  });

  it("folds separators, repeated spaces and case", () => {
    expect(normalizeHeader("  Full_Name  ")).toBe("full name");
    expect(normalizeHeader("PAYMENT-METHOD")).toBe("payment method");
  });
});

describe("columnFor", () => {
  it("reads the Arabic names", () => {
    expect(columnFor("الاسم الكامل")).toBe("fullName");
    expect(columnFor("الهاتف")).toBe("phone");
    expect(columnFor("القرية")).toBe("village");
    expect(columnFor("العصر")).toBe("age");
    expect(columnFor("طريقة الدفع")).toBe("paymentMethod");
    expect(columnFor("المبلغ المدفوع")).toBe("paidAmount");
    expect(columnFor("دفع الاشتراك")).toBe("paid");
  });

  it("reads the English names", () => {
    expect(columnFor("full name")).toBe("fullName");
    expect(columnFor("Phone Number")).toBe("phone");
    expect(columnFor("Age Group")).toBe("age");
    expect(columnFor("Paid Amount")).toBe("paidAmount");
  });

  it("returns nothing for a header it does not know", () => {
    expect(columnFor("ملاحظات")).toBeNull();
    expect(columnFor("")).toBeNull();
  });
});

describe("mapHeaders", () => {
  it("does not depend on the order of the columns", () => {
    const map = mapHeaders(["العصر", "الاسم الكامل", "الهاتف"]);
    expect(map.columns).toEqual(["age", "fullName", "phone"]);
    expect(map.found).toEqual(["age", "fullName", "phone"]);
  });

  it("keeps the first of two columns that mean the same thing", () => {
    const map = mapHeaders(["الاسم الكامل", "full name"]);
    expect(map.columns).toEqual(["fullName", null]);
    expect(map.unknown).toEqual(["full name"]);
  });

  it("reports a header it does not know rather than failing", () => {
    const map = mapHeaders(["الاسم الكامل", "ملاحظات"]);
    expect(map.found).toEqual(["fullName"]);
    expect(map.unknown).toEqual(["ملاحظات"]);
  });
});
