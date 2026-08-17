export interface AgeGroupRoster {
  name: string;
  active: number;
  pending: number;
  rejected: number;
}

export const AGE_GROUP_ROSTER: AgeGroupRoster[] = [
  { name: "البدريين", active: 24, pending: 0, rejected: 0 },
  { name: "المحسنين", active: 22, pending: 0, rejected: 0 },
  { name: "المجاهدين", active: 13, pending: 0, rejected: 0 },
  { name: "المتقين", active: 12, pending: 0, rejected: 0 },
  { name: "الساجدين", active: 0, pending: 12, rejected: 0 },
  { name: "الفائزين", active: 6, pending: 0, rejected: 1 },
  { name: "الشنقيطيين", active: 6, pending: 0, rejected: 0 },
  { name: "الصادقين", active: 5, pending: 0, rejected: 0 },
  { name: "المتحدين", active: 4, pending: 0, rejected: 0 },
  { name: "البارين", active: 3, pending: 0, rejected: 0 },
  { name: "التائبين", active: 3, pending: 0, rejected: 0 },
  { name: "المبشرين", active: 3, pending: 0, rejected: 0 },
  { name: "الخاشعين", active: 2, pending: 0, rejected: 0 },
  { name: "المتحالفين", active: 2, pending: 0, rejected: 0 },
  { name: "المنتصرين", active: 2, pending: 0, rejected: 0 },
  { name: "المنصورين", active: 2, pending: 0, rejected: 1 },
  { name: "الناجحين", active: 2, pending: 0, rejected: 0 },
  { name: "الدستوريين", active: 1, pending: 0, rejected: 0 },
  { name: "الذهبيين", active: 1, pending: 0, rejected: 0 },
  { name: "الشمسيين", active: 1, pending: 0, rejected: 0 },
  { name: "الصابرين", active: 1, pending: 0, rejected: 0 },
  { name: "الممدوحين", active: 1, pending: 0, rejected: 0 },
  { name: "النجميين", active: 1, pending: 0, rejected: 0 },
  { name: "الحافظين", active: 0, pending: 0, rejected: 0 },
];

export const AGE_GROUPS = AGE_GROUP_ROSTER.map((group) => group.name);

export const FIRST_NAMES = [
  "محمد",
  "أحمد",
  "سيدي",
  "الحسن",
  "عبد الله",
  "إبراهيم",
  "يعقوب",
  "المختار",
  "بابا",
  "الشيخ",
  "عثمان",
  "موسى",
  "خالد",
  "سليمان",
  "يوسف",
  "عمر",
];

export const LAST_NAMES = [
  "ولد أحمد",
  "ولد محمد",
  "ولد سيدي",
  "ولد الحسن",
  "ولد بابا",
  "ولد المختار",
  "ولد إبراهيم",
  "ولد عثمان",
];

export const PAYMENT_METHODS = ["بنكيلي", "السداد", "مصرفي", "نقداً"];

export const PAYMENT_METHOD_SHARE: [string, number][] = [
  ["بنكيلي", 108],
  ["السداد", 13],
  ["مصرفي", 10],
];

export const REJECTION_REASONS = [
  "الصورة غير واضحة",
  "المبلغ المدفوع غير مطابق",
  "لم يتم العثور على العملية",
  "معلومات ناقصة أو غير صحيحة",
  "طلب مكرر",
];

export const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
