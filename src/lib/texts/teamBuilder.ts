import { countedNoun, PLAYERS } from "../arabicPlural";

const ACCEPT = "قبول";
const DECLINE = "رفض";

export const teamBuilder = {
  yourTeam: "فريقك",
  createHeading: "أنشئ فريقك",
  namePlaceholder: "اسم الفريق",
  create: "أنشئ الفريق",
  created: "تم إنشاء فريقك",
  orJoin: "أو اطلب الانضمام إلى فريق موجود",
  pickTeam: "اطلب الانضمام إلى فريق",
  captain: "أنت قائد الفريق",
  captainMark: "قائد الفريق",
  rosterCount: (count: number) => countedNoun(count, PLAYERS),
  squadNeeds: (label: string) => `حجم الفريق ${label}`,
  incomplete: "الفريق غير مكتمل",
  awaitingApproval: "بانتظار الموافقة",
  cancelRequest: "إلغاء الطلب",
  teamLocked: "تم التأكيد — لا يمكن تغييره",
  invitationsHeading: "دعوات وصلتك",
  invitedBy: (teamName: string) => `فريق ${teamName} يدعوك للانضمام`,
  accept: ACCEPT,
  decline: DECLINE,
  acceptOf: (teamName: string) => `${ACCEPT} دعوة ${teamName}`,
  declineOf: (teamName: string) => `${DECLINE} دعوة ${teamName}`,
  accepted: "انضممت إلى الفريق",
  declined: "تم رفض الدعوة",
  inviteHeading: "ادعُ لاعباً إلى فريقك",
  invitePlaceholder: "اختر لاعباً",
  invite: "أرسل الدعوة",
  invited: "تم إرسال الدعوة",
  noCandidates: "لا يوجد لاعب بلا فريق في هذه البطولة",
  waitingOnInvitation: "بانتظار رده",
  waitingOnRequest: "طلب انضمام",
} as const;
