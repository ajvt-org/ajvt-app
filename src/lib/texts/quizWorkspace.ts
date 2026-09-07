export const quizWorkspace = {
  section: "المسابقة",
  tabs: {
    settings: "الإعدادات",
    participants: "المشاركون",
    standings: "الترتيب",
    scores: "النقاط",
  },
} as const;

export const quizBankCoverage = {
  title: "تغطية بنك الأسئلة",
  coverage: (plannable: number, rounds: string, needed: string, bankSize: number) =>
    `تُسحب أسئلة كل جولة من البنك عند الانطلاق. البنك يغطي ${plannable} من ${rounds}، المطلوب ${needed} والمتوفر ${bankSize}.`,
  short: "البنك لا يكفي لكل الجولات، لن تنطلق المسابقة قبل اكتمال المخزون",
} as const;

export const quizStandings = {
  block: "فترة الترتيب",
  empty: "لا ترتيب بعد",
} as const;
