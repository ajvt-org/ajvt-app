import { describe, it, expect } from "vitest";
import { readBankReference } from "./bankReference";

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
