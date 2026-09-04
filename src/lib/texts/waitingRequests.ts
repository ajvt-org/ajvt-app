export const waitingRequests = {
  since: (days: string) => `منذ ${days}`,
  waitingOver: (days: string) => `ينتظر أكثر من ${days}`,
  chase: "تذكير",
} as const;

export const samePerson = {
  heading: "عضوية أخرى تحمل نفس الاسم على حساب آخر",
  hint: "تشابه الأسماء وارد، فتحقق قبل أن تقرر.",
} as const;
