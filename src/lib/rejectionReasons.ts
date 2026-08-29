// Pure constant shared by client and server code (admin dashboard picker,
// /home's rejection display, the validate API's server-side check) — no
// prisma import here, this gets bundled into client components.
//
// Fixed list rather than free text: the member sees this directly, and a
// short list keeps it something they can act on without contacting the
// association.
//
// Every reason names something wrong with the payment, and every one of them
// is fixable by paying again or sending a better proof. A duplicate was on
// this list once and was neither: it told a person their request was refused
// for something only an admin could clear up, and left them resubmitting the
// same payment forever. Duplicates are settled by deleting the extra person.
export const REJECTION_REASONS = [
  "الصورة غير واضحة",
  "المبلغ المدفوع غير مطابق",
  "لم يتم العثور على العملية",
  "معلومات ناقصة أو غير صحيحة",
] as const;
