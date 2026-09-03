import { ouguiya } from "./currency";
import { money } from "../money";

export const financeReport = {
  from: "من",
  to: "إلى",
  run: "اعرض التقرير",
  print: "اطبع",
  span: (from: string, to: string) => `من ${from} إلى ${to}`,
  moneyDetail: (income: number, spending: number) => `دخل ${money(income)}، صرف ${money(spending)}`,
  splitDetail: (fees: number, support: number) => `انتساب ${money(fees)}، دعم ${money(support)}`,
  monthByMonth: "شهراً بشهر",
  amountsIn: `المبالغ بال${ouguiya.singular}`,
  month: "الشهر",
  income: "دخل",
  spending: "صرف",
  net: "الصافي",
  incomeByTag: "الدخل حسب الوسم",
  spendingByTag: "الصرف حسب الوسم",
  tagTotal: "مجموع الوسوم",
  tagsOverlap: "المبلغ الواحد يُحتسب تحت كل وسم يحمله، لذلك يتجاوز المجموع هنا الإجمالي",
} as const;
