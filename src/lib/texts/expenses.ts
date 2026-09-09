import { ouguiya } from "./currency";

export const expenseForm = {
  editTitle: "تعديل مصروف",
  addTitle: "إضافة مصروف",
  proofHeading: "صورة الفاتورة / الإيصال (اختياري)",
  proofLabel: "صورة الفاتورة",
  label: "الوصف",
  amount: `المبلغ (${ouguiya.singular})`,
  method: "طريقة الدفع (اختياري)",
  noMethod: "أخرى",
  date: "التاريخ",
  note: "ملاحظة (اختياري)",
  destination: "الوجهة (اختياري)",
  tags: "التصنيفات",
  noTags: "لا توجد تصنيفات بعد، أضفها من زر التصنيفات",
  save: "حفظ التعديل",
  add: "إضافة المصروف",
} as const;

export const expensesPage = {
  labelRequired: "الوصف مطلوب",
  amountInvalid: "المبلغ يجب أن يكون رقماً صحيحاً موجباً",
  confirmDeleteTitle: "حذف مصروف",
  confirmDelete: "هل أنت متأكد من حذف هذا المصروف؟",
  delete: "حذف المصروف",
  exportAction: "تصدير",
  ledger: (count: number) => `سجل المصاريف (${count})`,
  tags: "التصنيفات",
  addExpense: "إضافة مصروف",
  searchPlaceholder: "بحث بالوصف أو المبلغ...",
  filter: "تصفية",
  destination: "الوجهة",
  expenseDate: "تاريخ المصروف",
} as const;

export const expenseList = {
  edit: "تعديل",
  delete: "حذف",
  history: "السجل",
  recordedBy: (name: string) => `بواسطة ${name}`,
  empty: "لا توجد مصاريف مسجلة بعد",
  emptyFiltered: "لا توجد نتائج مطابقة",
} as const;

export const byPaymentMethod = {
  title: "حسب طريقة الدفع (كل الإيرادات)",
  empty: "لا توجد بيانات بعد",
  noEntries: "لا يوجد",
  membership: "1- انتساب",
  support: "2- دعم",
  anonymous: "فاعل خير",
} as const;

export const dailyRevenue = {
  title: "الإيرادات اليومية (آخر 30 يوماً)",
  empty: "لا توجد إيرادات في هذه الفترة",
  noDetail: "لا توجد تفاصيل",
} as const;

export const financeTotals = {
  revenue: `الإيرادات (${ouguiya.singular})`,
  expenses: `المصاريف (${ouguiya.singular})`,
  net: `الصافي (${ouguiya.singular})`,
} as const;

export const expenseProofs = {
  heading: "الفواتير والإيصالات (اختياري)",
  addAnother: "إضافة صورة أخرى",
  addFirst: "صورة الفاتورة",
  remove: (at: number) => `حذف الصورة ${at}`,
  open: (at: number) => `فتح الصورة ${at}`,
  none: "لا توجد صور بعد",
} as const;

export const expenseReceipts = {
  title: "الفواتير والإيصالات",
  openOne: (at: number) => `فتح الصورة ${at}`,
} as const;

export const expenseDestinations = {
  heading: "الوجهة (اختياري)",
  headingMany: "الوجهات والمبالغ",
  add: "أضف وجهة أخرى",
  remove: (at: number) => `حذف الوجهة ${at}`,
  destinationLabel: (at: number) => `الوجهة ${at}`,
  amountLabel: (at: number) => `مبلغ الوجهة ${at}`,
  total: "مجموع الوجهات",
  matches: "يساوي مبلغ المصروف",
  short: (by: number) => `ينقص ${by}`,
  over: (by: number) => `يزيد ${by}`,
} as const;
