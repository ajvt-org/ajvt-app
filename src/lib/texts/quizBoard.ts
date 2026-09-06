export const quizBoard = {
  visitorNoCompetitions: "لا توجد مسابقة معروضة الآن. أنشئ حساباً وأكمل استمارة الانضمام للمشاركة.",
  ineligible:
    "يجب أن تكون منتسباً مقبولاً وقد دفعت رسوم الانتساب لتتمكن من المشاركة في المسابقات الثقافية.",
  backHome: "العودة للرئيسية",
  noCompetitions: "لا توجد مسابقة تشارك فيها الآن",
  visitorHint: "الترتيب معروض للجميع. أنشئ حساباً للمشاركة في الجولات.",
  ineligibleHint: "الترتيب معروض للجميع. المشاركة في الجولات للمنتسبين الذين دفعوا رسوم الانتساب.",
  roundOpen: (n: number) => `الجولة ${n} مفتوحة الآن`,
  startRound: "ابدأ الجولة",
  resumeRound: "أكمل الجولة",
  signUpToPlay: "سجّل للمشاركة",
} as const;

export const quizPicker = {
  before: "لم تنطلق بعد",
  open: "جولة مفتوحة الآن",
  closed: "بين جولتين",
  over: "انتهت",
  startsIn: "تنطلق بعد",
  startsInLabel: "الوقت المتبقي لانطلاق المسابقة",
  roundsPassed: (passed: number, rounds: string) => `${passed} من ${rounds}`,
  tutorialCorner: "ركن التجربة",
  newHere: "جديد على المسابقات؟",
  learnInAMinute: "تعلّم اللعب في دقيقة",
  tutorialSize: (questions: string) => `${questions} للتجربة، لا تُحتسب في المسابقة`,
  startTutorial: "ابدأ الجولة التجريبية",
} as const;
