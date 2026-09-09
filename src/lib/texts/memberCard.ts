export const memberCard = {
  title: "بطاقة العضوية",
  association: "رابطة شباب قرية",
  village: "التاكلالت",
  memberSince: "عضو منذ",
  image: "صورة",
  pdf: "PDF",
  share: "مشاركة",
  busy: "...",
  fileName: (memberNumber: string, extension: string) => `بطاقة-عضوية-${memberNumber}.${extension}`,
} as const;
