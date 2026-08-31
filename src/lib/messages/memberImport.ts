export const memberImportErrors = {
  emptyFile: "الملف فارغ",
  headersOnly: "الملف لا يحتوي على أي سطر بيانات",
  noColumns: "تعذّرت قراءة الملف، تأكد من أنه ملف CSV يحتوي على أسماء الأعمدة في السطر الأول",
  missingName: "عمود الاسم الكامل غير موجود في الملف",
  tooManyRows: (max: number) => `الملف يتجاوز الحد المسموح (${max} سطراً)`,
} as const;
