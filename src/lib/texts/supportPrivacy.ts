export const supportPrivacy = {
  checkbox: "اكتم اسمه في الدعم",
  saving: "...",
  save: "حفظ",
  saved: "تم الحفظ",
  existingEntries: (count: number) =>
    `يوجد ${count} سجلاً في سجل الإجراءات يذكر اسمه من قبل. سجل الإجراءات لا يُعدّل تلقائياً.`,
  noExistingEntries: "لا يوجد في سجل الإجراءات ما يذكر اسمه.",
} as const;
