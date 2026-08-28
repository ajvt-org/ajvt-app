import { HOME_VILLAGE, OTHER_VILLAGE } from "../../src/lib/villages";

export interface AgeGroupRoster {
  name: string;
  active: number;
  pending: number;
  rejected: number;
  total: number;
}

export const AGE_GROUP_ROSTER: AgeGroupRoster[] = [
  { name: "البدريين", active: 24, pending: 0, rejected: 0, total: 40 },
  { name: "المحسنين", active: 22, pending: 0, rejected: 0, total: 30 },
  { name: "المجاهدين", active: 13, pending: 0, rejected: 0, total: 50 },
  { name: "المتقين", active: 12, pending: 0, rejected: 0, total: 33 },
  { name: "الساجدين", active: 0, pending: 12, rejected: 0, total: 30 },
  { name: "الفائزين", active: 6, pending: 0, rejected: 1, total: 42 },
  { name: "الشنقيطيين", active: 6, pending: 0, rejected: 0, total: 46 },
  { name: "الصادقين", active: 5, pending: 0, rejected: 0, total: 30 },
  { name: "المتحدين", active: 4, pending: 0, rejected: 0, total: 30 },
  { name: "البارين", active: 3, pending: 0, rejected: 0, total: 32 },
  { name: "التائبين", active: 3, pending: 0, rejected: 0, total: 23 },
  { name: "المبشرين", active: 3, pending: 0, rejected: 0, total: 26 },
  { name: "الخاشعين", active: 2, pending: 0, rejected: 0, total: 31 },
  { name: "المتحالفين", active: 2, pending: 0, rejected: 0, total: 30 },
  { name: "المنتصرين", active: 2, pending: 0, rejected: 0, total: 30 },
  { name: "المنصورين", active: 2, pending: 0, rejected: 1, total: 32 },
  { name: "الناجحين", active: 2, pending: 0, rejected: 0, total: 30 },
  { name: "الدستوريين", active: 1, pending: 0, rejected: 0, total: 30 },
  { name: "الذهبيين", active: 1, pending: 0, rejected: 0, total: 25 },
  { name: "الشمسيين", active: 1, pending: 0, rejected: 0, total: 38 },
  { name: "الصابرين", active: 1, pending: 0, rejected: 0, total: 30 },
  { name: "الممدوحين", active: 1, pending: 0, rejected: 0, total: 30 },
  { name: "النجميين", active: 1, pending: 0, rejected: 0, total: 44 },
  { name: "الحافظين", active: 0, pending: 0, rejected: 0, total: 30 },
];

export const AGE_GROUPS = AGE_GROUP_ROSTER.map((group) => group.name);

export interface NeighbourRoster {
  village: string;
  active: number;
  pending: number;
  rejected: number;
}

// Members from outside the home village. They hold no age group: the عصر are
// التاكلالت lineages, so the form never asks anyone else for one.
export const NEIGHBOUR_ROSTER: NeighbourRoster[] = [
  { village: "أفجار", active: 9, pending: 3, rejected: 1 },
  { village: OTHER_VILLAGE, active: 3, pending: 2, rejected: 0 },
];

export const SEED_VILLAGES = [HOME_VILLAGE, "أفجار"];

// One عصر nobody has approved yet, so the moderation panel has something in it.
export const SUGGESTED_AGE_GROUP = "المقترحين";

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
