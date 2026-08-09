import { prisma } from "./prisma";

export async function generateMemberNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.member.count();
  const seq = String(count + 1).padStart(4, "0");
  return `AJVT-${year}-${seq}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const CITIES = [
  "الجزائر العاصمة",
  "وهران",
  "قسنطينة",
  "عنابة",
  "بجاية",
  "تيزي وزو",
  "سطيف",
  "باتنة",
  "تلمسان",
  "بسكرة",
  "المسيلة",
  "برج بوعريريج",
  "الأغواط",
  "الأوراس",
  "الشلف",
  "تبسة",
  "جيجل",
  "سكيكدة",
  "سوق أهراس",
  "تيارت",
  "الجلفة",
  "خنشلة",
  "ميلة",
  "أخرى",
];
