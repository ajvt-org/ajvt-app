// Pure helpers shared by client and server code — no prisma import here
// (this file is bundled into client components like the membership form).

export const MEMBERSHIP_FEE = 100;

export function validatePaidAmount(v: unknown): string | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < MEMBERSHIP_FEE) {
    return `يرجى إدخال مبلغ صحيح (${MEMBERSHIP_FEE} أوقية على الأقل)`;
  }
  return null;
}
