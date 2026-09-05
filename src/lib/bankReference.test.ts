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
