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
  confirmDelete: "هل أنت متأكد من حذف هذا المصروف؟",
  title: "المصاريف والإيرادات",
  exportAction: "تصدير",
  ledger: (count: number) => `سجل المصاريف (${count})`,
  tags: "التصنيفات",
  addExpense: "إضافة مصروف",
  searchPlaceholder: "بحث بالوصف أو المبلغ...",
  filterBy: "تصفية:",
  from: "من",
  to: "إلى",
  resetFilters: "إعادة تصفير الكل",
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
