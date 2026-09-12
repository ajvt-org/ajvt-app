export const proofCheck = {
  prompt: "اختر صورة الكابتير",
  change: "اختر صورة أخرى",
  checking: "جاري الفحص...",
  nothingTitle: "لا يوجد سجل يحمل هذا الملف بعينه",
  nothingNote:
    "هذا لا يعني أن التحويل جديد. الفحص يطابق الملف حرفياً، والصورة نفسها إذا أعيد حفظها أو ضغطها تعطي ملفاً مختلفاً ولا يجدها.",
  foundNote: "الملف نفسه مرفق بالسجلات التالية.",
  open: "فتح السجل",
  stateActive: "قائم",
  stateOther: (state: string) => `الحالة ${state}`,
} as const;
