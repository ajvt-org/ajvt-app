import { extractPaymentReference } from "./paymentReference";

export const MAX_BANK_REFERENCE = 40;

export function readBankReference(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, "") : "";
}

export function looksLikeReference(value: string): boolean {
  const typed = readBankReference(value);
  if (!typed) return true;
  return extractPaymentReference(typed) !== null;
}
