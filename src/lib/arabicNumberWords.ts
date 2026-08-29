import { countCategory } from "./arabicCount";

export type Gender = "m" | "f";

interface Scale {
  one: string;
  dual: string;
  dualBound: string;
  plural: string;
  accusative: string;
}

const ONES: Record<Gender, string[]> = {
  m: ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"],
  f: ["", "واحدة", "اثنتان", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثماني", "تسع", "عشر"],
};

const COMPOUND_ONES: Record<Gender, string[]> = {
  m: ["", "أحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"],
  f: ["", "إحدى", "اثنتان", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثماني", "تسع"],
};

const TEEN_HEAD: Record<Gender, string[]> = {
  m: ["", "أحد", "اثنا"],
  f: ["", "إحدى", "اثنتا"],
};

const TEEN_TAIL: Record<Gender, string> = { m: "عشر", f: "عشرة" };

const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];

const HUNDREDS = [
  "",
  "مائة",
  "مائتان",
  "ثلاثمائة",
  "أربعمائة",
  "خمسمائة",
  "ستمائة",
  "سبعمائة",
  "ثمانمائة",
  "تسعمائة",
];

const BOUND_TWO_HUNDRED = "مائتا";

const THOUSAND: Scale = {
  one: "ألف",
  dual: "ألفان",
  dualBound: "ألفا",
  plural: "آلاف",
  accusative: "ألفاً",
};

const MILLION: Scale = {
  one: "مليون",
  dual: "مليونان",
  dualBound: "مليونا",
  plural: "ملايين",
  accusative: "مليوناً",
};

const BILLION: Scale = {
  one: "مليار",
  dual: "ملياران",
  dualBound: "مليارا",
  plural: "مليارات",
  accusative: "ملياراً",
};

export const MAX_SPELLED = 999_999_999_999;

function under100(n: number, gender: Gender): string {
  if (n <= 10) return ONES[gender][n];
  if (n < 20) {
    const digit = n - 10;
    const head = digit <= 2 ? TEEN_HEAD[gender][digit] : ONES[gender][digit];
    return `${head} ${TEEN_TAIL[gender]}`;
  }
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  if (!unit) return TENS[tens];
  return `${COMPOUND_ONES[gender][unit]} و${TENS[tens]}`;
}

function under1000(n: number, gender: Gender, bound: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) {
    parts.push(hundreds === 2 && !rest && bound ? BOUND_TWO_HUNDRED : HUNDREDS[hundreds]);
  }
  if (rest) parts.push(under100(rest, gender));
  return parts.join(" و");
}

function scaled(count: number, scale: Scale, bound: boolean): string {
  if (count === 1) return scale.one;
  if (count === 2) return bound ? scale.dualBound : scale.dual;
  const words = under1000(count, "m", true);
  const category = countCategory(count);
  if (category === "few") return `${words} ${scale.plural}`;
  if (category === "many") return `${words} ${bound ? scale.one : scale.accusative}`;
  return `${words} ${scale.one}`;
}

export function numberToArabicWords(n: number, gender: Gender): string {
  if (!Number.isInteger(n) || n < 0 || n > MAX_SPELLED) return "";
  if (n === 0) return "صفر";

  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (billions) parts.push(scaled(billions, BILLION, !millions && !thousands && !rest));
  if (millions) parts.push(scaled(millions, MILLION, !thousands && !rest));
  if (thousands) parts.push(scaled(thousands, THOUSAND, !rest));
  if (rest) parts.push(under1000(rest, gender, true));
  return parts.join(" و");
}
