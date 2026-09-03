import { money } from "../money";

export const stepPayment = {
  payAtLeast: (fee: number) =>
    `الاشتراك ${money(fee)} على الأقل — أدِّ المبلغ ثم التقط صورة من تأكيد العملية وارفعها أدناه`,
  feeMinimum: (fee: number) =>
    `الحد الأدنى ${money(fee)} لرسوم الاشتراك — أي مبلغ زائد يُسجَّل كتبرّع بعد قبول الطلب، وتختار أنت كيف يظهر`,
} as const;
