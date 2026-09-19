import { counted } from "../arabicCount";
import { POINT } from "../messages";

export const standingsBoard = {
  podium: "المنصة",
  myPlace: (rank: number, total: number) => `ترتيبك ${rank} بمجموع ${counted(total, POINT)}`,
  blockTimer: "الوقت المتبقي في الكتلة",
} as const;
