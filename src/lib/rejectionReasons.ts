// Pure constant shared by client and server code (admin dashboard picker,
// /home's rejection display, the validate API's server-side check) — no
// prisma import here, this gets bundled into client components.
//
// Fixed list rather than free text: the member sees this directly, and a
// short list keeps it something they can act on without contacting the
// association.
export const REJECTION_REASONS = [
  "الصورة غير واضحة",
  "المبلغ المدفوع غير مطابق",
  "لم يتم العثور على العملية",
  "معلومات ناقصة أو غير صحيحة",
  "طلب مكرر",
] as const;
