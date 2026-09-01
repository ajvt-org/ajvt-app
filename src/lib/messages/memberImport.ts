export const memberImportErrors = {
  emptyFile: "الملف فارغ",
  headersOnly: "الملف لا يحتوي على أي سطر بيانات",
  noColumns: "تعذّرت قراءة الملف، تأكد من أنه ملف CSV يحتوي على أسماء الأعمدة في السطر الأول",
  missingName: "عمود الاسم الكامل غير موجود في الملف",
  fileTooBig: "الملف كبير جداً",
  tooManyRows: (max: number) => `الملف يتجاوز الحد المسموح (${max} سطراً)`,
} as const;

export const memberImportRow = {
  unknownVillage: "قرية غير معروفة، اخترها من القائمة",
  unknownAgeGroup: "عصر غير معروف، اخترها من القائمة",
  phoneInFileTwice: (row: number) => `نفس رقم الهاتف موجود في السطر ${row}`,
  phoneOnAnotherAccount: "هذا الرقم مستعمل لحساب موجود",
  nameLooksExisting: "يوجد شخص بنفس الاسم والقرية والعصر، تأكد قبل الإضافة",
  nameInFileTwice: (row: number) => `نفس الاسم موجود في السطر ${row}`,
  paymentMethodUnknown: "طريقة دفع غير معروفة",
  paidUnclear: "تعذّرت قراءة خانة الاشتراك، اعتُبرت غير مدفوعة",
} as const;

export const memberImportRun = {
  batchAlreadyRan: "تم تنفيذ هذا الاستيراد بالفعل",
  nothingToImport: "لا يوجد سطر للاستيراد",
  accountGone: "الحساب غير موجود",
  phoneTaken: "هذا الرقم مستعمل لحساب آخر",
  rowFailed: "تعذّر إنشاء هذا السطر",
  matchChanged: "تغيّر الحساب المطابق لهذا السطر بعد المراجعة، راجع الملف من جديد",
} as const;
