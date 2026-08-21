export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

const pairing = (home: string, away: string) => `«${home}» × «${away}»`;

export const notify = {
  quizDayOpen: (): PushPayload => ({
    title: "جولة جديدة في المسابقة",
    body: "الأسئلة متاحة الآن، شارك قبل إغلاق الباب",
    url: "/quiz",
  }),

  matchScheduled: (home: string, away: string, activityId: string): PushPayload => ({
    title: "مباراة جديدة لفريقك",
    body: pairing(home, away),
    url: `/tournament/${activityId}`,
  }),

  matchReminder: (home: string, away: string, activityId: string): PushPayload => ({
    title: "مباراة فريقك غداً",
    body: pairing(home, away),
    url: `/tournament/${activityId}`,
  }),

  matchResult: (
    home: string,
    homeScore: number,
    awayScore: number,
    away: string,
    activityId: string,
  ): PushPayload => ({
    title: "انتهت مباراة فريقك",
    body: `«${home}» ${homeScore} – ${awayScore} «${away}»`,
    url: `/tournament/${activityId}`,
  }),

  mvpVoteOpen: (home: string, away: string, activityId: string): PushPayload => ({
    title: "من الأفضل في المباراة؟",
    body: `افتُتِح التصويت، ${pairing(home, away)}`,
    url: `/tournament/${activityId}`,
  }),

  membershipDecision: (accepted: boolean): PushPayload =>
    accepted
      ? { title: "قُبِلَت عضويتك", body: "مرحباً بك بيننا، حسابك جاهز", url: "/profile" }
      : {
          title: "قرار العضوية",
          body: "نأسف، لم يُقبَل طلب انضمامك هذه المرة",
          url: "/profile",
        },

  registrationDecision: (
    accepted: boolean,
    activityTitle: string,
    reason?: string,
  ): PushPayload => {
    if (accepted) {
      return { title: "قُبِلَ تسجيلك", body: `مكانك محجوز في «${activityTitle}»`, url: "/home" };
    }
    const cause = reason?.trim();
    return {
      title: "قرار التسجيل",
      body: `نأسف، لم يُقبَل تسجيلك في «${activityTitle}»${cause ? `، ${cause}` : ""}`,
      url: "/home",
    };
  },
} as const;
