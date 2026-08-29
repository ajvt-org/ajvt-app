export type PaymentReference = {
  provider: "bankily" | "sedad" | "masrivi";
  reference: string;
};

const SHAPES: { provider: PaymentReference["provider"]; pattern: RegExp }[] = [
  { provider: "sedad", pattern: /\bTR\d{11}\b/ },
  { provider: "masrivi", pattern: /\bREF\d{9}\b/ },
  { provider: "bankily", pattern: /(?<!\d)\d{19}(?!\d)/ },
];

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

export function bankilyStamp(reference: string): string | null {
  if (!/^\d{19}$/.test(reference)) return null;
  const [, yy, mm, dd, hh, mi, ss] =
    reference.match(/^\d{2}(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/) ?? [];
  if (!yy) return null;
  return `20${yy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}
