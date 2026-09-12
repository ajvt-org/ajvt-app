import { countedNoun, POINTS } from "../arabicPlural";

export const standingsBoard = {
  podium: "المنصة",
  myPlace: (rank: number, total: number) => `ترتيبك ${rank} بمجموع ${countedNoun(total, POINTS)}`,
  blockTimer: "الوقت المتبقي في الكتلة",
} as const;
