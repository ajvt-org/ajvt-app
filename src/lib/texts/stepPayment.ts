import { money } from "../money";
import { ouguiya } from "./currency";

export const stepPayment = {
  methodLabel: "طريقة الدفع",
  accountLabel: "الرقم الذي دفعت إليه",
  payingWith: (method: string) => `الدفع عبر ${method}`,
  receivingNumber: "رقم المستلم",
  amount: "المبلغ",
  orderCode: "رمز الطلب (اكتبه في سبب التحويل)",
  memberCode: "رقم عضويتك (اكتبه في سبب التحويل)",
  bankReference: "رقم العملية من الإشعار",
  bankReferenceHint: "اختياري، انسخه من إشعار التحويل",
  bankReferenceOdd: "لا يشبه رقم عملية، تأكد منه",
  paidLabel: `المبلغ المدفوع (${ouguiya.singular})`,
  sending: "جاري إرسال الطلب...",
  saveEdits: "حفظ التعديلات",
  send: "إرسال طلب الانضمام",
  sendRenewal: "إرسال التجديد",
  payAtLeast: (fee: number) =>
    `الاشتراك ${money(fee)} على الأقل — أدِّ المبلغ ثم التقط صورة من تأكيد العملية وارفعها أدناه`,
  feeMinimum: (fee: number) =>
    `الحد الأدنى ${money(fee)} لرسوم الاشتراك — أي مبلغ زائد يُسجَّل كتبرّع بعد قبول الطلب، وتختار أنت كيف يظهر`,
} as const;
