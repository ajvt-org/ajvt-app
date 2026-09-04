import { money } from "../money";
import { ouguiya } from "./currency";

export const stepPayment = {
  methodLabel: "طريقة الدفع",
  payingWith: (method: string) => `الدفع عبر ${method}`,
  receivingNumber: "رقم المستلم",
  amount: "المبلغ",
  orderCode: "رمز الطلب (اكتبه في سبب التحويل)",
  paidLabel: `المبلغ المدفوع (${ouguiya.singular})`,
  sending: "جاري إرسال الطلب...",
  saveEdits: "حفظ التعديلات",
  send: "إرسال طلب الانضمام",
  payAtLeast: (fee: number) =>
    `الاشتراك ${money(fee)} على الأقل — أدِّ المبلغ ثم التقط صورة من تأكيد العملية وارفعها أدناه`,
  feeMinimum: (fee: number) =>
    `الحد الأدنى ${money(fee)} لرسوم الاشتراك — أي مبلغ زائد يُسجَّل كتبرّع بعد قبول الطلب، وتختار أنت كيف يظهر`,
} as const;
