export const treasury = {
  title: "خزينة الجمعية",
  balance: "الرصيد الحالي",
  balanceHint: "مجموع ما دخل الخزينة ناقص كل المصاريف المسجلة.",
  income: "المداخيل",
  spending: "المصاريف",
  fees: "رسوم الانتساب",
  support: "الدعم والتبرعات",
  byMethod: "المداخيل حسب طريقة الدفع",
  noIncome: "لا توجد مداخيل مسجلة بعد",
  loading: "جاري التحميل...",
  ouguiya: (amount: number) => `${amount} أوقية`,
} as const;
