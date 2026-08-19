import { prisma } from "./client";

export async function wipe() {
  await prisma.mvpVote.deleteMany();
  await prisma.mvpCandidate.deleteMany();
  await prisma.matchMvpVote.deleteMany();
  await prisma.matchGoal.deleteMany();
  await prisma.matchBooking.deleteMany();
  await prisma.match.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.teamFollow.deleteMany();
  await prisma.team.deleteMany();
  await prisma.group.deleteMany();
  await prisma.activityRegistration.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.quizAttemptAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizRoundQuestion.deleteMany();
  await prisma.quizRound.deleteMany();
  await prisma.quizParticipant.deleteMany();
  await prisma.competition.deleteMany();
  await prisma.quizAnswer.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quizSettings.deleteMany();
  await prisma.deletedRecord.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.financeTag.deleteMany();
  await prisma.siteVisit.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.member.deleteMany();
  await prisma.user.deleteMany();
  await prisma.counter.deleteMany();
}
