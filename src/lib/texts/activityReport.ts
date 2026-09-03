import { ouguiya } from "./currency";
import { money } from "../money";

export const activityReport = {
  navLabel: "تقرير الأنشطة",
  from: "من",
  to: "إلى",
  run: "اعرض التقرير",
  print: "اطبع",
  exportCsv: "تصدير",
  span: (from: string, to: string) => `من ${from} إلى ${to}`,
  general: "بلا نشاط",
  generalNote: "ما لم يُربط بنشاط، رسوم الانتساب والدعم العام والمصاريف العامة.",
  empty: "لا حركة مالية في هذه الفترة",
  activity: "النشاط",
  income: "دخل",
  spending: "صرف",
  balance: "الرصيد",
  total: "المجموع",
  amountsIn: `المبالغ بال${ouguiya.singular}`,
  surplus: "فائض",
  deficit: "عجز",
  even: "متعادل",
  spendingByTag: "الصرف حسب الوسم",
  incomeByTag: "الدخل حسب الوسم",
  receipts: "الوصولات",
  noReceipts: "لا وصولات مرقّمة في هذه الفترة",
  reconciles: (income: number, spending: number) =>
    `يطابق التقرير المالي لنفس الفترة، دخل ${money(income)} وصرف ${money(spending)}`,
} as const;
