import { countedNoun, PLAYERS } from "../arabicPlural";

const ACCEPT = "قبول";
const REJECT = "رفض";
const REMOVE = "إزالة";

export const teamsTab = {
  confirmDelete: "هل تريد حذف هذا الفريق؟",
  teamCount: (count: number) => `عدد الفرق: ${count}`,
  teamCountShown: (shown: number, total: number) => `عدد الفرق: ${shown} من ${total}`,
  searchPlaceholder: "ابحث عن فريق أو لاعب",
  searchLabel: "البحث في الفرق واللاعبين",
  noMatch: "لا فريق ولا لاعب بهذا الاسم",
  rosterSubset: (shown: number, total: number) => `يظهر ${shown} من ${total}، البحث يخفي البقية`,
  save: "حفظ",
  cancel: "إلغاء",
  deleteTeam: "حذف الفريق",
  teamLogo: "شعار الفريق",
  changeTeamLogo: "تغيير شعار الفريق",
  renameTeam: "تعديل اسم الفريق",
  fromHomeVillage: "فريق من التاكلالت",
  squadOfRange: (count: number, min: number | null, max: number) =>
    min === null
      ? `${teamsTab.rosterCount(count)}، الحد الأقصى ${max}`
      : `${teamsTab.rosterCount(count)}، الحد الأدنى ${min} والحد الأقصى ${max}`,
  outsideOfLimit: (count: number, limit: number) => `${count} من خارج التاكلالت والحد ${limit}`,
  outsidePlayerOverLimit: "فوق حد اللاعبين من خارج التاكلالت",
  squadSize: (size: string) => `حجم الفريق ${size}`,
  rosterCount: (count: number) => countedNoun(count, PLAYERS),
  awaitingCount: (count: number) => `${count} بانتظار الموافقة`,
  makeCaptain: (name: string) => `اجعل ${name} قائد الفريق`,
  clearCaptain: (name: string) => `إلغاء قيادة ${name} للفريق`,
  noPlayers: "لا يوجد لاعبون بعد",
  awaitingApproval: "بانتظار الموافقة",
  accept: ACCEPT,
  acceptOf: (name: string) => `${ACCEPT} ${name}`,
  rejectOf: (name: string) => `${REJECT} ${name}`,
  removeOf: (name: string) => `${REMOVE} ${name}`,
  confirmRemove: (name: string) => `إزالة ${name} من الفريق؟`,
  confirmReject: (name: string) => `رفض طلب ${name} للانضمام؟`,
  openCardOf: (name: string) => `فتح بطاقة ${name}`,
  pickPlayer: "اختر لاعباً...",
  add: "إضافة",
  addPlayer: "إضافة لاعب",
  newTeamName: "اسم الفريق الجديد",
  team: "فريق",
  unassigned: (count: number) => `لاعبون غير مصنّفين (${count})`,
} as const;
