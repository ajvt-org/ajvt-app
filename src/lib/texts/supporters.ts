import { countedLabel } from "../arabicPlural";
import { money } from "../money";

export const supporters = {
  title: "لوحة شرف المتبرعين",
  placeColumn: "#",
  supporterColumn: "الداعم",
  totalColumn: "المجموع",
  place: (rank: number) => `المركز ${rank}`,
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

export const surplusCard = {
  title: "دعمك فوق رسوم الاشتراك",
  hint: (amount: number) =>
    `${money(amount)} تظهر في لوحة شرف المتبرعين. يمكنك تغيير طريقة ظهورها متى شئت.`,
  saved: "تم الحفظ",
} as const;
