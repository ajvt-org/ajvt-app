export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 8) return "يجب أن يكون رقم الهاتف 8 أرقام بالضبط";
  if (!["2", "3", "4"].includes(digits[0]))
    return "يجب أن يبدأ الرقم بـ 2 أو 3 أو 4";
  return null;
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
