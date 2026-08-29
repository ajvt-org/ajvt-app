export const quizRecap = {
  title: "أسئلة الجولة الماضية",
  round: (index: number) => `الجولة ${index}`,
  show: "عرض الأسئلة",
  hide: "إخفاء الأسئلة",
  oneAnswer: "الإجابة الصحيحة",
  manyAnswers: "الإجابات الصحيحة",
  rate: (percent: number) => `${percent}% أجابوا صحيحاً`,
  noAnswers: "لم يجب أحد على هذا السؤال",
  rightOfAnswered: (right: number, answered: number) => `${right} من ${answered}`,
} as const;
