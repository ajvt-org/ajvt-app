export const matchUnitCard = {
  unitNumber: (word: string, order: number) => `${word} ${order}`,
  open: (name: string) => `فتح ${name}`,
  close: (name: string) => `طي ${name}`,
  endedByRule: (name: string) => `أنهتها ${name}`,
  counted: (worth: string) => `تُحتسب ${worth}`,
  decider: "الوحدة الحاسمة",
  wonBy: (name: string) => `فوز ${name}`,
  drawn: "تعادل",
  abandoned: "متوقفة",
} as const;
