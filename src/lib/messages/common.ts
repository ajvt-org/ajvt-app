// Messages a route sends back to the browser, grouped by the part of the app
// they belong to. They live here rather than inline because the same sentence
// was written out in up to twenty-three files, and because a second language
// needs one place to translate rather than a search across the routes.
export const common = {
  invalidBody: "بيانات غير صالحة",
  unauthorized: "غير مصرح",
  forbidden: "ليس لديك صلاحية لهذا الإجراء",
  allFieldsRequired: "يرجى ملء جميع الحقول",
  tooManyAttempts: "محاولات كثيرة جداً، حاول بعد قليل",
  invalidDate: "تاريخ غير صالح",
} as const;
