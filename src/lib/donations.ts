// Pure helpers shared by client and server code — no prisma import here
// (this file is bundled into client components like the membership form).

export const MEMBERSHIP_FEE = 100;

// Self-service flows (membership form, public donate form) require a
// transfer-proof screenshot, so cash isn't an option there — only admin
// contexts (manual entry/edit, where the admin vouches in person) allow it.
export const ONLINE_PAYMENT_METHODS = ["بنكيلي", "السداد", "مصرفي"];
export const PAYMENT_METHODS = [...ONLINE_PAYMENT_METHODS, "نقداً"];

export function validatePaidAmount(v: unknown): string | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < MEMBERSHIP_FEE) {
    return `يرجى إدخال مبلغ صحيح (${MEMBERSHIP_FEE} أوقية على الأقل)`;
  }
  return null;
}
