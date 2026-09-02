import { money } from "../money";

export const adminHome = {
  matchesToday: "مباريات اليوم",
  renewedQuestion: (year: number) => `من جدد عضوية ${year}`,
  renewedDetail: (current: number, activeCounted: string) => `${current} حالي من ${activeCounted}`,
  moneyQuestion: "ما دخل وما خرج",
  moneyDetail: (revenue: number, spending: number) =>
    `دخل ${money(revenue)}، صرف ${money(spending)}`,
  pendingQuestion: "ما ينتظر البت فيه",
  pendingDetail: (members: number, activities: number, payments: number) =>
    `عضويات ${members}، أنشطة ${activities}، دفعات ${payments}`,
  version: "الإصدار",
} as const;
