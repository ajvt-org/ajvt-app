export const memberCard = {
  title: "بطاقة العضوية",
  logoAlt: "شعار",
  association: "رابطة شباب قرية",
  village: "التاكلالت",
  memberSince: (date: string) => `عضو منذ ${date}`,
  image: "صورة",
  pdf: "PDF",
  share: "مشاركة",
  busy: "...",
  qrHint: "امسح رمز QR للتحقق من صلاحية العضوية",
  fileName: (memberNumber: string, extension: string) => `بطاقة-عضوية-${memberNumber}.${extension}`,
} as const;
