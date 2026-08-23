export const adminHome = {
  matchesToday: "مباريات اليوم",
  renewedQuestion: (year: number) => `من جدد عضوية ${year}`,
  renewedDetail: (current: number, activeCounted: string) => `${current} حالي من ${activeCounted}`,
  moneyQuestion: "ما دخل وما خرج",
  ouguiya: (amount: number) => `${amount} أوقية`,
  moneyDetail: (revenue: number, spending: number) => `دخل ${revenue} أوقية، صرف ${spending} أوقية`,
  pendingQuestion: "ما ينتظر البت فيه",
  pendingDetail: (members: number, activities: number, payments: number) =>
    `عضويات ${members}، أنشطة ${activities}، دفعات ${payments}`,
  version: "الإصدار",
} as const;
