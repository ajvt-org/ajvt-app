// Pure helpers shared by client and server code — no prisma import here
// (this file is bundled into client components like the membership form).

// Fallback only. The live value lives in AppSettings so the association can
// change it without a deploy; callers that can reach the database pass it in.
export const MEMBERSHIP_FEE = 100;

// Self-service flows (membership form, public donate form) require a
// transfer-proof screenshot, so cash isn't an option there — only admin
// contexts (manual entry/edit, where the admin vouches in person) allow it.
export const ONLINE_PAYMENT_METHODS = ["بنكيلي", "السداد", "مصرفي"];
export const PAYMENT_METHODS = [...ONLINE_PAYMENT_METHODS, "نقداً"];

export function validatePaidAmount(v: unknown, fee: number = MEMBERSHIP_FEE): string | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < fee) {
    return `يرجى إدخال مبلغ صحيح (${fee} أوقية على الأقل)`;
  }
  return null;
}
