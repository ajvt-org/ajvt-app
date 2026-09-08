import { counted } from "../arabicCount";
import { EXPENSE } from "../messages";

export const financeTags = {
  title: "تصنيفات المصاريف",
  close: "إغلاق",
  newTagPlaceholder: "تصنيف جديد",
  newTagLabel: "اسم التصنيف الجديد",
  add: "إضافة",
  empty: "لا توجد تصنيفات بعد",
  renameLabel: "الاسم الجديد",
  save: "حفظ",
  cancel: "إلغاء",
  editOf: (name: string) => `تعديل ${name}`,
  deleteOf: (name: string) => `حذف ${name}`,
  confirmDeleteTitle: "حذف تصنيف",
  confirmDelete: "حذف هذا التصنيف؟",
  confirmDeleteInUse: (count: number) =>
    `سيُزال هذا التصنيف من ${counted(count, EXPENSE)}. المصاريف نفسها تبقى. متابعة؟`,
  delete: "حذف",
} as const;
