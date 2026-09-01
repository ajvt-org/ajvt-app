import { lists } from "./lists";

import { countedNoun, type NounForms } from "../arabicPlural";

const UNKNOWN_MINUTE_GOALS: NounForms = {
  one: "هدف دون دقيقة مسجلة",
  two: "هدفان دون دقيقة مسجلة",
  few: "أهداف دون دقيقة مسجلة",
  many: "هدفاً دون دقيقة مسجلة",
  other: "هدف دون دقيقة مسجلة",
};

export const matchDisplay = {
  tieUnresolved: "متساويان تماماً — يفصل بينهما القرعة",
  tieMark: "قرعة",
  forfeitBadge: "انسحاب",
  unknownScorer: "مجهول",
  unknownMinute: (count: number) => countedNoun(count, UNKNOWN_MINUTE_GOALS),
  unknownMinuteTally: (count: number) => `×${count}`,
  ownGoal: "ع",
  penaltyShort: "ج",
  extraTimeShort: "و.إ",
  penalties: "ركلات ترجيح",
  motm: "رجل المباراة",
  priorMeetings: "مواجهات سابقة:",
  meetingSeparator: lists.separator,
  upcomingShort: "قادمة",
  todayMatches: "مباريات اليوم",
  clubName: "رابطة شباب قرية التاكلالت",
  shareResult: "مشاركة النتيجة",
  timeline: "مجريات المباراة",
  hideTimeline: "إخفاء المجريات",
} as const;

export const publicTournament = {
  standings: "الترتيب",
  bracket: "الدور الإقصائي",
  matches: "المباريات",
  upcoming: "مباريات قادمة",
  results: "النتائج",
  stats: "الإحصائيات",
  scorers: "الهدافون",
  discipline: "الانضباط",
  defence: "أفضل دفاع",
  motm: "رجل المباراة",
  teams: "الفرق",
  players: "اللاعبون",
  group: "مجموعة",
  noGroup: "بدون مجموعة",
  noMatchesYet: "لم تُحدَّد المباريات بعد",
  noTeamsYet: "لم تُحدَّد الفرق بعد",
  noPlayersYet: "لم يُحدَّد اللاعبون بعد",
  teamDecidedLater: "يُحدد لاحقاً",
  bracketRound: (round: number) => `الدور ${round}`,
} as const;
