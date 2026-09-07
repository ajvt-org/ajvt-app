export const reviewQueue = {
  rejectReasonLabel: "سبب رفض الإثبات — سيظهر للعضو",
  bulkReasonLabel: "سبب رفض الإثبات",
  cancel: "إلغاء",
  confirmReject: "تأكيد الرفض",
  accept: "قبول الدفع",
  reject: "رفض إثبات الدفع",
  markRejected: "تغيير الدفع إلى مرفوض",
  markAccepted: "تغيير الدفع إلى معتمد",
  rejectionReason: "سبب رفض الإثبات:",
  busy: "...",
} as const;

export const bulkReview = {
  approveTitle: "قبول الطلبات المحددة",
  approve: (count: number) => `قبول ${count} طلب دفع؟`,
  approveLabel: "قبول الكل",
  refuseTitle: "رفض الطلبات المحددة",
  refuse: (count: number, reason: string) => `رفض ${count} طلب دفع بسبب: ${reason}؟`,
  refuseLabel: "رفض الكل",
  moveTitle: "نقل الأعضاء المحددين",
  move: (count: number, age: string) => `نقل ${count} عضو إلى عصر ${age}؟`,
  moveLabel: "نقل",
  someFailed: (count: number) => `تعذّر تنفيذ ${count} من الطلبات`,
  someNotMoved: (count: number) => `تعذّر نقل ${count} من الأعضاء`,
  failed: "حدث خطأ أثناء التنفيذ الجماعي",
} as const;
