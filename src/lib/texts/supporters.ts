import { countedNoun, type CountedNoun } from "../arabicCount";
import { money } from "../money";

const YOUR_PLACE: CountedNoun = {
  one: "مركزك بين الداعمين",
  two: "مركزاك بين الداعمين",
  few: "مراكزك بين الداعمين",
  many: "مراكزك بين الداعمين",
};

export const supporters = {
  title: "لوحة شرف المتبرعين",
  placeColumn: "#",
  supporterColumn: "الداعم",
  totalColumn: "المجموع",
  place: (rank: number) => `المركز ${rank}`,
  yourPlaces: (count: number) => countedNoun(count, YOUR_PLACE),
  namedGiving: "تبرعاتك باسمك",
  unnamedGiving: "تبرعاتك دون اسم",
  donate: "ادعم الرابطة الآن",
  emptyTitle: "لا يوجد متبرعون بعد",
  emptyHint: "كن أول داعم للرابطة!",
  loading: "جاري التحميل...",
  more: "عرض المزيد",
  loadFailed: "تعذّر تحميل المزيد، حاول مرة أخرى",
} as const;

export const adminSupporters = {
  count: "عدد الداعمين",
  given: "مجموع الدعم",
  empty: "لا يوجد داعمون بعد",
  fromDonation: "تبرع",
  fromMembership: "من دفعة انتساب",
} as const;

export const surplusCard = {
  hint: (amount: number) =>
    `${money(amount)} تظهر في لوحة شرف المتبرعين. يمكنك تغيير طريقة ظهورها متى شئت.`,
  saved: "تم الحفظ",
} as const;
