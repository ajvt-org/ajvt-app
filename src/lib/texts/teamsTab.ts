import { countedNoun, PLAYERS } from "../arabicPlural";

const ACCEPT = "قبول";
const REJECT = "رفض";
const REMOVE = "إزالة";
const WITHDRAW = "سحب";

export const teamsTab = {
  confirmDeleteTitle: "حذف فريق",
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
  outsideCount: (count: number) => `${count} من خارج التاكلالت`,
  outsideOfLimit: (count: number, limit: number) =>
    `${teamsTab.outsideCount(count)} والحد ${limit}`,
  outsidePlayerOverLimit: "فوق حد اللاعبين من خارج التاكلالت",
  squadSize: (size: string) => `حجم الفريق ${size}`,
  rosterCount: (count: number) => countedNoun(count, PLAYERS),
  awaitingCount: (count: number) => `${count} بانتظار الموافقة`,
  requestCount: (count: number) => `${count} طلب انضمام`,
  invitationCount: (count: number) => `${count} دعوة لم يُرد عليها`,
  makeCaptain: (name: string) => `اجعل ${name} قائد الفريق`,
  clearCaptain: (name: string) => `إلغاء قيادة ${name} للفريق`,
  noPlayers: "لا يوجد لاعبون بعد",
  awaitingApproval: "بانتظار الموافقة",
  joinRequest: "طلب انضمام من اللاعب",
  captainInvitation: "دعوة من قائد الفريق",
  accept: ACCEPT,
  acceptOf: (name: string) => `${ACCEPT} ${name}`,
  rejectOf: (name: string) => `${REJECT} ${name}`,
  removeOf: (name: string) => `${REMOVE} ${name}`,
  confirmRemoveTitle: "إزالة لاعب",
  confirmRemove: (name: string) => `إزالة ${name} من الفريق؟`,
  remove: REMOVE,
  reject: REJECT,
  confirmRejectTitle: "رفض طلب انضمام",
  confirmReject: (name: string) => `رفض طلب ${name} للانضمام؟`,
  confirmWithdrawTitle: "سحب دعوة",
  confirmWithdraw: (name: string) => `سحب دعوة ${name}؟`,
  withdraw: WITHDRAW,
  withdrawOf: (name: string) => `سحب دعوة ${name}`,
  seatOf: (name: string) => `إدخال ${name} إلى الفريق`,
  openCardOf: (name: string) => `فتح بطاقة ${name}`,
  pickPlayer: "اختر لاعباً...",
  add: "إضافة",
  addPlayer: "إضافة لاعب",
  newTeamName: "اسم الفريق الجديد",
  team: "فريق",
  unassigned: (count: number) => `لاعبون غير مصنّفين (${count})`,
} as const;
