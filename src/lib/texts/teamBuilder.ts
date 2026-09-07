import { countedNoun, PLAYERS } from "../arabicPlural";

export const teamBuilder = {
  yourTeam: "فريقك",
  createHeading: "أنشئ فريقك",
  namePlaceholder: "اسم الفريق",
  nameLabel: "اسم فريقك",
  create: "أنشئ الفريق",
  created: "تم إنشاء فريقك",
  orJoin: "أو اطلب الانضمام إلى فريق موجود",
  pickTeam: "اطلب الانضمام إلى فريق",
  captain: "أنت قائد الفريق",
  rosterCount: (count: number) => countedNoun(count, PLAYERS),
  squadNeeds: (label: string) => `حجم الفريق ${label}`,
  incomplete: "الفريق غير مكتمل",
  awaitingApproval: "بانتظار الموافقة",
  cancelRequest: "إلغاء الطلب",
  teamLocked: "تم التأكيد — لا يمكن تغييره",
} as const;
