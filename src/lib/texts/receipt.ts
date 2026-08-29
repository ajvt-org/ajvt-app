import { ouguiya } from "./currency";

export const receiptSheet = {
  org: "رابطة شباب قرية التاكلالت",
  secretariat: "الأمانة العامة للرابطة",
  kind: "وصل قبض",
  payer: "الجهة الدافعة",
  reason: "موجب القبض",
  inWords: "المبلغ بالأحرف",
  inFigures: "المبلغ بالأرقام",
  currency: ouguiya.singular,
  date: "التاريخ",
  secretary: "الأمين العام",
  treasurer: "مسؤول المالية",
  verifyHint: "امسح للتحقق",
  voided: "ملغى",
  logoAlt: "شعار الرابطة",
  sealAlt: "ختم الرابطة",
  qrAlt: "رمز التحقق",
} as const;

export const receiptPurpose = {
  membership: "اشتراك عضوية",
  activity: "دعم نشاط",
  donation: "تبرع",
  fileName: (number: string, extension: string) => `وصل-${number}.${extension}`,
} as const;

export const receiptAdmin = {
  tab: "الوصولات",
  title: "وصولات القبض",
  newReceipt: "وصل جديد",
  payerLabel: "الجهة الدافعة",
  payerPlaceholder: "اسم من دفع",
  reasonLabel: "موجب القبض",
  reasonPlaceholder: "سبب الدفع",
  amountLabel: "المبلغ (أوقية)",
  wordsLabel: "المبلغ بالأحرف",
  dateLabel: "التاريخ",
  memberLabel: "ربط بعضو (اختياري)",
  save: "حفظ وطباعة",
  saving: "...",
  preview: "معاينة الوصل",
  download: "تحميل PDF",
  voidAction: "إلغاء الوصل",
  voidReasonLabel: "سبب الإلغاء",
  voidConfirm: "تأكيد الإلغاء",
  empty: "لم يصدر أي وصل بعد.",
  yearLabel: "سنة الإصدار",
  issuedBy: "أصدره",
  statusVoid: "ملغى",
  statusActive: "ساري",
  yearFilter: "السنة",
  allYears: "كل السنوات",
  officersMissing: "أضف اسم الأمين العام ومسؤول المالية في الإعدادات ليظهرا على الوصل.",
} as const;

export const memberReceipts = {
  title: "وصولات الدفع",
  pdf: "حفظ PDF",
  share: "مشاركة",
} as const;

export const receiptVerify = {
  title: "التحقق من وصل القبض",
  valid: "وصل صحيح",
  voided: "وصل ملغى",
  unknown: "وصل غير معروف",
  validHint: "هذا الوصل صادر عن الرابطة.",
  voidedHint: "أُلغي هذا الوصل ولم يعد صالحاً.",
  unknownHint: "لا يوجد وصل بهذا الرمز.",
  numberLabel: "رقم الوصل",
  payerLabel: "الجهة الدافعة",
  reasonLabel: "موجب القبض",
  amountLabel: "المبلغ",
  wordsLabel: "المبلغ بالأحرف",
  dateLabel: "التاريخ",
  voidedAtLabel: "تاريخ الإلغاء",
  home: "الصفحة الرئيسية للرابطة",
} as const;
