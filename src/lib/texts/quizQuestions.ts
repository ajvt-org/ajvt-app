export const quizSettingsForm = {
  title: "إعدادات الأسئلة",
  confirmAnswers: "زر تأكيد الإجابة",
  confirmAnswersKeeps:
    "يسري التغيير من الجولة القادمة، والأسئلة متعددة الإجابات تحتفظ بالزر دائماً.",
  defaultsTitle: "ما يظهر جاهزاً عند إضافة سؤال جديد",
  defaultsLead: "كل ما يخص سير المسابقة يضبط داخل المسابقة نفسها.",
  defaultAnswerCount: "عدد الإجابات الافتراضي",
  defaultCorrectCount: "عدد الإجابات الصحيحة الافتراضي",
  defaultPoints: "النقاط الافتراضية للسؤال",
  tutorialTitle: "مؤقّت الجولة التجريبية",
  tutorialBankLead: "أسئلة الجولة التجريبية في بنك الجولة التجريبية، وتُحرَّر مثل أي بنك آخر.",
  tutorialFullSeconds: "ثواني النقاط الكاملة",
  tutorialMaxSeconds: "مدة السؤال بالثواني",
  tutorialFloorPercent: "أقل نسبة من النقاط",
  save: "حفظ الإعدادات",
} as const;

export const quizQuestionList = {
  heading: (count: number) => `الأسئلة (${count})`,
  headingFiltered: (shown: number, total: number) => `الأسئلة (${shown}/${total})`,
  import: "استيراد",
  create: "سؤال جديد",
  search: "بحث في السؤال أو التصنيف أو الأجوبة...",
  empty: "لا توجد أسئلة مسجلة بعد",
  emptyFiltered: "لا يوجد سؤال يطابق البحث",
  disabled: "معطّل",
  edit: "تعديل",
  disable: "إيقاف",
  enable: "تفعيل",
  remove: "حذف",
  outOf: "من",
  play: (sent: number, answered: number, correct: number) =>
    `أُرسلت لـ ${sent} · أُجيبت ${answered} · صحيحة ${correct}`,
  moveUp: "تقديم السؤال",
  moveDown: "تأخير السؤال",
} as const;
