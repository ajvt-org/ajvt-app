import { ouguiya } from "./currency";

export const treasury = {
  title: "خزينة الجمعية",
  balance: "الرصيد الحالي",
  balanceHint: "مجموع ما دخل الخزينة ناقص كل المصاريف المسجلة.",
  income: "المداخيل",
  spending: "المصاريف",
  fees: "رسوم الانتساب",
  support: "الدعم والتبرعات",
  byMethod: "المداخيل حسب طريقة الدفع",
  spendingByMethod: "المصاريف حسب طريقة الدفع",
  noSpending: "لا توجد مصاريف مسجلة بعد",
  noIncome: "لا توجد مداخيل مسجلة بعد",
  loading: "جاري التحميل...",
  currency: ouguiya.singular,
} as const;
