import { randomUUID } from "crypto";
import { prisma } from "./client";
import { questionBank } from "./questionBank";
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
  const handwritten = QUESTIONS.map(([text, category, answers, correctIndex], i) => ({
    spec: [text, category, answers, correctIndex] as QuestionSpec,
    active: i !== QUESTIONS.length - 1,
  }));
  const generated = questionBank().map((spec) => ({ spec, active: true }));

  const seen = new Set<string>();
  const unique = [...handwritten, ...generated].filter(({ spec }) => {
    const key = spec[0].replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const rows = unique.map(({ spec, active }) => ({
    id: randomUUID(),
    text: spec[0],
    category: spec[1],
    points: 10,
    correctCount: 1,
    active,
    createdBy: "admin",
    answers: spec[2].map((text, order) => ({ text, isCorrect: order === spec[3], order })),
  }));

  await prisma.quizQuestion.createMany({
    data: rows.map(({ answers, ...q }) => {
      void answers;
      return q;
    }),
  });
  await prisma.quizAnswer.createMany({
    data: rows.flatMap((q) => q.answers.map((a) => ({ ...a, questionId: q.id }))),
  });

  return rows.map((q) => ({ id: q.id }));
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
