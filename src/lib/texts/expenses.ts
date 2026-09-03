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
  activity: "النشاط (اختياري)",
  noActivity: "بدون نشاط",
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
} as const;

export const financeTotals = {
  revenue: `الإيرادات (${ouguiya.singular})`,
  expenses: `المصاريف (${ouguiya.singular})`,
  net: `الصافي (${ouguiya.singular})`,
} as const;
