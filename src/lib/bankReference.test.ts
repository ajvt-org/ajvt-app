import { describe, it, expect } from "vitest";
import { looksLikeReference, readBankReference } from "./bankReference";

const BANKILY = "7026081422303210001";
const SEDAD = "TR10000000001";
const MASRIVI = "REF100000001";

describe("reading a transaction number somebody typed", () => {
  it("drops the spaces they may have grouped it with", () => {
    expect(readBankReference(" TR 100 000 000 01 ")).toBe(SEDAD);
  });

  it("reads nothing from anything that is not text", () => {
    expect(readBankReference(null)).toBe("");
    expect(readBankReference(12)).toBe("");
  });

  it("reads Arabic-Indic digits as the digits they are", () => {
    expect(
      readBankReference(
        "\u0667\u0660\u0662\u0666\u0660\u0668\u0661\u0664\u0662\u0662\u0663\u0660\u0663\u0662\u0661\u0660\u0660\u0660\u0661",
      ),
    ).toBe(BANKILY);
  });

  it("reads the extended Arabic-Indic digits too", () => {
    expect(
      readBankReference(
        "\u06f7\u06f0\u06f2\u06f6\u06f0\u06f8\u06f1\u06f4\u06f2\u06f2\u06f3\u06f0\u06f3\u06f2\u06f1\u06f0\u06f0\u06f0\u06f1",
      ),
    ).toBe(BANKILY);
  });

  it("reads a number typed in either script the same way", () => {
    expect(
      readBankReference("TR\u0661\u0660\u0660\u0660\u0660\u0660\u0660\u0660\u0660\u0660\u0661"),
    ).toBe(SEDAD);
  });

  it("reads the provider prefix whatever case it was typed in", () => {
    expect(readBankReference("tr10000000001")).toBe(SEDAD);
    expect(readBankReference("Ref100000001")).toBe(MASRIVI);
  });

  it("drops the direction marks an Arabic keyboard leaves behind", () => {
    expect(readBankReference("\u200fTR10000000001\u200e")).toBe(SEDAD);
  });
});

describe("whether a typed number looks like a transaction number", () => {
  it("recognises the shape each provider prints", () => {
    expect(looksLikeReference(BANKILY)).toBe(true);
    expect(looksLikeReference(SEDAD)).toBe(true);
    expect(looksLikeReference(MASRIVI)).toBe(true);
  });

  it("recognises one typed in groups", () => {
    expect(looksLikeReference("7026 0814 2230 3210 001")).toBe(true);
  });

  it("recognises one typed in Arabic-Indic digits", () => {
    expect(
      looksLikeReference(
        "\u0667\u0660\u0662\u0666\u0660\u0668\u0661\u0664\u0662\u0662\u0663\u0660\u0663\u0662\u0661\u0660\u0660\u0660\u0661",
      ),
    ).toBe(true);
  });

  it("recognises one whose prefix was typed in lower case", () => {
    expect(looksLikeReference("tr10000000001")).toBe(true);
  });

  it("says nothing about an empty box, since it is optional", () => {
    expect(looksLikeReference("")).toBe(true);
    expect(looksLikeReference("   ")).toBe(true);
  });

  it("does not recognise the order code the app generates", () => {
    expect(looksLikeReference("AJV-EG8A6")).toBe(false);
  });

  it("does not recognise an amount or a phone number", () => {
    expect(looksLikeReference("2100")).toBe(false);
    expect(looksLikeReference("22334455")).toBe(false);
  });

  it("does not recognise a run of digits of the wrong length", () => {
    expect(looksLikeReference("702608142230321000")).toBe(false);
    expect(looksLikeReference("70260814223032100012")).toBe(false);
  });
});
