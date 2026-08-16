// Reads the transaction reference off the text of a payment receipt.
//
// Why the reference and not the picture: two receipts from the same provider
// for two honest payments are the same screenshot apart from a few dozen
// characters, so comparing images marks every legitimate payment as a
// duplicate. The reference is the one thing that differs by transaction, and
// it survives the member re-screenshotting the receipt to change the bytes.
//
// Three providers pay this association, each with its own shape, and each
// labels it differently by language — Txn ID, Trs ID, معرف المعاملة, رقم
// المعاملة, ID de la transaction. The label is therefore ignored and the
// value is matched on its own form, which is the part that does not change.
//
// Bankily's number is not random: 19 digits reading as a 2-digit prefix, then
// YYMMDD, then HHMMSS, then five more. It agrees with the date printed beside
// it on every sample, which is what makes it worth cross-checking later.
export type PaymentReference = {
  provider: "bankily" | "sedad" | "masrivi";
  reference: string;
};

const SHAPES: { provider: PaymentReference["provider"]; pattern: RegExp }[] = [
  { provider: "sedad", pattern: /\bTR\d{11}\b/ },
  { provider: "masrivi", pattern: /\bREF\d{9}\b/ },
  { provider: "bankily", pattern: /(?<!\d)\d{19}(?!\d)/ },
];

// The merchant code says the money reached this association rather than
// somebody else, which no amount of duplicate checking would catch.
export const MERCHANT_CODES = ["027217", "08493", "037940"] as const;

export function extractPaymentReference(text: string): PaymentReference | null {
  const flat = text.replace(/[  \s]+/g, " ");
  for (const { provider, pattern } of SHAPES) {
    const found = flat.match(pattern);
    if (found) return { provider, reference: found[0] };
  }
  return null;
}

export function mentionsKnownMerchant(text: string): boolean {
  return MERCHANT_CODES.some((code) => text.includes(code));
}

// Bankily buries the moment of payment in its reference. A receipt whose
// printed date disagrees with the one inside its own number has been edited.
export function bankilyStamp(reference: string): string | null {
  if (!/^\d{19}$/.test(reference)) return null;
  const [, yy, mm, dd, hh, mi, ss] =
    reference.match(/^\d{2}(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/) ?? [];
  if (!yy) return null;
  return `20${yy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}
