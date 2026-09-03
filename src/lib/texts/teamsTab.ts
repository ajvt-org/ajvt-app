import { countedNoun, PLAYERS } from "../arabicPlural";

const ACCEPT = "قبول";
const REJECT = "رفض";
const REMOVE = "إزالة";
const CAPTAIN = "القائد";

export const teamsTab = {
  confirmDelete: "هل تريد حذف هذا الفريق؟",
  teamCount: (count: number) => `عدد الفرق: ${count}`,
  save: "حفظ",
  cancel: "إلغاء",
  deleteTeam: "حذف الفريق",
  teamLogo: "شعار الفريق",
  changeTeamLogo: "تغيير شعار الفريق",
  renameTeam: "تعديل اسم الفريق",
  rosterOf: (count: number, size: number) => `${count} / ${size}`,
  rosterCount: (count: number) => countedNoun(count, PLAYERS),
  awaitingCount: (count: number) => `${count} بانتظار الموافقة`,
  captain: CAPTAIN,
  captainBadge: (name: string) => `${CAPTAIN} ${name}`,
  makeCaptain: (name: string) => `اجعل ${name} قائد الفريق`,
  clearCaptain: (name: string) => `إلغاء قيادة ${name} للفريق`,
  makeCaptainAction: "تعيين قائداً",
  clearCaptainAction: "إلغاء القيادة",
  noPlayers: "لا يوجد لاعبون بعد",
  awaitingApproval: "بانتظار الموافقة",
  accept: ACCEPT,
  acceptOf: (name: string) => `${ACCEPT} ${name}`,
  reject: REJECT,
  rejectOf: (name: string) => `${REJECT} ${name}`,
  remove: REMOVE,
  removeOf: (name: string) => `${REMOVE} ${name}`,
  openCard: "البطاقة",
  openCardOf: (name: string) => `فتح بطاقة ${name}`,
  pickPlayer: "اختر لاعباً...",
  add: "إضافة",
  addPlayer: "إضافة لاعب",
  newTeamName: "اسم الفريق الجديد",
  team: "فريق",
  unassigned: (count: number) => `لاعبون غير مصنّفين (${count})`,
} as const;
