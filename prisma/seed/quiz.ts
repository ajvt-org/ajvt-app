import { prisma } from "./client";
import { daysAgo, minutesAgo } from "./random";
import type { SeededUser } from "./members";

type QuestionSpec = [string, string, string[], number];

const QUESTIONS: QuestionSpec[] = [
  ["في أي سنة تأسست رابطة شباب قرية التاكلالت؟", "تاريخ", ["2015", "2018", "2020", "2022"], 1],
  ["كم عدد اللاعبين في فريق كرة القدم داخل الملعب؟", "رياضة", ["9", "10", "11", "12"], 2],
  ["ما هي عاصمة موريتانيا؟", "جغرافيا", ["نواذيبو", "نواكشوط", "روصو", "كيفة"], 1],
  ["كم عدد أركان الإسلام؟", "ثقافة عامة", ["أربعة", "خمسة", "ستة", "سبعة"], 1],
];

export async function seedQuizSettings() {
  await prisma.quizSettings.upsert({
    where: { id: "singleton" },
    update: { answerWindowSeconds: 10, minScorePercent: 40 },
    create: { id: "singleton", answerWindowSeconds: 10, minScorePercent: 40 },
  });
}

export async function seedQuestions() {
  const created = [];

  for (let q = 0; q < QUESTIONS.length; q++) {
    const [text, category, answers, correctIndex] = QUESTIONS[q];
    const question = await prisma.quizQuestion.create({
      data: {
        text,
        category,
        points: 10,
        correctCount: 1,
        active: q !== QUESTIONS.length - 1,
        createdBy: "admin",
      },
    });

    for (let i = 0; i < answers.length; i++) {
      await prisma.quizAnswer.create({
        data: {
          questionId: question.id,
          text: answers[i],
          isCorrect: i === correctIndex,
          order: i,
        },
      });
    }

    created.push(question);
  }

  return created;
}

export async function seedAssignments(users: SeededUser[], questions: { id: string }[]) {
  for (let i = 0; i < users.length; i++) {
    const question = questions[i % questions.length];
    const state = i % 5;

    await prisma.quizAssignment.create({
      data: {
        userId: users[i].id,
        questionId: question.id,
        batchId: "seed-batch-1",
        mode: "RANDOM",
        sentAt: daysAgo(5),
        revealedAt: state === 0 ? null : state === 1 ? minutesAgo(0) : daysAgo(4),
        answeredAt: state === 2 || state === 3 || state === 4 ? daysAgo(4) : null,
        isCorrect: state === 2 ? true : state === 3 || state === 4 ? false : null,
        pointsAwarded: state === 2 ? 8 : 0,
      },
    });
  }
}
