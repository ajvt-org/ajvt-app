import { randomUUID } from "crypto";
import { prisma } from "./client";
import { questionBank } from "./questionBank";
import { daysAgo, minutesAgo } from "./random";
import type { SeededUser } from "./members";

export async function seedQuizSettings() {
  await prisma.quizSettings.upsert({
    where: { id: "singleton" },
    update: { answerWindowSeconds: 10, minScorePercent: 40 },
    create: { id: "singleton", answerWindowSeconds: 10, minScorePercent: 40 },
  });
}

export async function seedQuestions() {
  const rows = questionBank().map(([text, category, answers, correctIndex, points]) => ({
    id: randomUUID(),
    text,
    category,
    points,
    correctCount: 1,
    active: true,
    createdBy: "admin",
    answers: answers.map((answer, order) => ({
      text: answer,
      isCorrect: order === correctIndex,
      order,
    })),
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
