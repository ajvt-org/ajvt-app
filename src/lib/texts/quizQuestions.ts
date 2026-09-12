export const quizBankPicker = {
  title: "بنوك الأسئلة",
  create: "بنك جديد",
  name: "اسم البنك",
  save: "حفظ",
  cancel: "إلغاء",
  rename: (name: string) => `تعديل ${name}`,
  remove: (name: string) => `حذف ${name}`,
  deleteTitle: "حذف البنك",
  deleteMessage: (name: string) => `سيتم حذف ${name}. هذا ممكن فقط إذا كان فارغاً.`,
  deleteConfirm: "حذف",
} as const;

export const quizSettingsForm = {
  confirmAnswers: "زر تأكيد الإجابة",
  defaultsTitle: "ما يظهر جاهزاً عند إضافة سؤال جديد",
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

export const quizAdminToast = {
  confirmAnswersOn: "أعيد زر تأكيد الإجابة، ويسري من الجولة القادمة",
  confirmAnswersOff: "أصبح اختيار الإجابة يرسلها مباشرة، ويسري من الجولة القادمة",
  settingsSaved: "تم حفظ الإعدادات",
  questionSaved: "تم حفظ التعديل",
  questionAdded: "تمت إضافة السؤال",
  questionDeleted: "تم حذف السؤال",
} as const;

export const quizQuestionList = {
  deleteQuestionTitle: "حذف سؤال",
  deleteQuestion: "هل أنت متأكد من حذف هذا السؤال؟ سيتم حذف كل الإجابات المرتبطة به.",
  deleteQuestionConfirm: "حذف السؤال",
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
  answerShape: (correct: number, total: number) => `${correct} من ${total}`,
  answersMark: "شكل الإجابات",
  noCorrect: "لا إجابة صحيحة محددة",
  play: (sent: number, answered: number, correct: number) =>
    `أُرسلت لـ ${sent} · أُجيبت ${answered} · صحيحة ${correct}`,
  moveUp: "تقديم السؤال",
  moveDown: "تأخير السؤال",
} as const;

export const quizQuestionForm = {
  editTitle: "تعديل سؤال",
  addTitle: "سؤال جديد",
  text: "نص السؤال",
  category: "التصنيف",
  categoryPlaceholder: "تاريخ، رياضة، جغرافيا...",
  points: "النقاط",
  correctCount: "عدد الإجابات الصحيحة",
  answers: "الإجابات",
  addAnswer: "إضافة إجابة",
  answerPlaceholder: (index: number) => `إجابة ${index}`,
  answerCorrect: (index: number) => `الإجابة ${index} صحيحة`,
  removeAnswer: "حذف الإجابة",
  save: "حفظ التعديل",
  add: "إضافة السؤال",
} as const;
