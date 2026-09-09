import { ouguiya } from "./currency";

export const donationForm = {
  donorPhoto: "صورة المتبرع (اختياري)",
  proof: "إثبات الدفع",
  donorName: "اسم المتبرع",
  phone: "رقم الهاتف (اختياري)",
  amount: `المبلغ (${ouguiya.singular})`,
  paymentMethod: "طريقة الدفع",
  methodUnset: "غير محددة",
  paidOn: "تاريخ الدفع",
  paidOnHint: "اليوم الذي وصل فيه المال، لا يوم تسجيله",
  destination: "وجهة الدعم",
  anonymous: "إظهاره باسم فاعل خير",
  contactFromAccount: "الاسم ورقم الهاتف مأخوذان من حساب العضو المرتبط",
  unlink: "إلغاء الربط",
} as const;
