import { extractPaymentReference } from "./paymentReference";

export const MAX_BANK_REFERENCE = 40;

const ARABIC_INDIC = /[\u0660-\u0669\u06f0-\u06f9]/g;
const INVISIBLE = /[\u061c\u200b-\u200f\ufeff]/g;

function latinDigit(digit: string): string {
  const code = digit.codePointAt(0) as number;
  return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
}

export function readBankReference(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(INVISIBLE, "")
    .replace(/\s+/g, "")
    .replace(ARABIC_INDIC, latinDigit)
    .toUpperCase();
}

export function looksLikeReference(value: string): boolean {
  const typed = readBankReference(value);
  if (!typed) return true;
  return extractPaymentReference(typed) !== null;
}
