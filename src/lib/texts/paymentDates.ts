export const paymentDates = {
  groupedByPaidOn: "المبالغ محسوبة بيوم الدفع، وبيوم التسجيل حين لا يحمل الدفع تاريخاً",
  paidOn: (date: string) => `دُفعت بتاريخ ${date}`,
  recordedOn: (date: string, time: string) => `سُجلت بتاريخ ${date} — ${time}`,
} as const;
