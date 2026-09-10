import type { PaymentValues } from "./constants";

function stringAt(source: Record<string, unknown>, key: keyof PaymentValues): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

export function parseDraft(raw: string): PaymentValues {
  const parsed: unknown = JSON.parse(raw);
  const source =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  return {
    paymentMethod: stringAt(source, "paymentMethod"),
    accountId: stringAt(source, "accountId"),
    bankReference: stringAt(source, "bankReference"),
    paidAmount: stringAt(source, "paidAmount"),
    referenceCode: stringAt(source, "referenceCode"),
  };
}
