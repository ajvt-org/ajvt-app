import { countedLabel } from "../arabicPlural";
import { ouguiya } from "./currency";

export const supporters = {
  title: "لوحة شرف المتبرعين",
  placeColumn: "#",
  supporterColumn: "الداعم",
  totalColumn: "المجموع",
  place: (rank: number) => `المركز ${rank}`,
  amount: ouguiya.amount,
  yourPlaces: (count: number) =>
    countedLabel(count, "مركزك بين الداعمين", "مركزاك بين الداعمين", "مراكزك بين الداعمين"),
  namedGiving: "تبرعاتك باسمك",
  unnamedGiving: "تبرعاتك دون اسم",
  donate: "ادعم الرابطة الآن",
  emptyTitle: "لا يوجد متبرعون بعد",
  emptyHint: "كن أول داعم للرابطة!",
  loading: "جاري التحميل...",
  more: "عرض المزيد",
  loadFailed: "تعذّر تحميل المزيد، حاول مرة أخرى",
} as const;
