import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { elections as messages } from "./messages";
import { orderForReader, stillWorthShowing } from "./election";

const CANDIDATE_SELECT = {
  id: true,
  fullName: true,
  photo: true,
  order: true,
} as const;

const ELECTION_SELECT = {
  id: true,
  title: true,
  startsAt: true,
  durationMinutes: true,
  allowBlank: true,
  shuffleCandidates: true,
  showResults: true,
} as const;

export type VisibleElection = {
  id: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  allowBlank: boolean;
  shuffleCandidates: boolean;
  showResults: boolean;
};

export async function visibleElections(now = new Date()) {
  const rows = await prisma.election.findMany({
    where: { hidden: false },
    select: { ...ELECTION_SELECT, _count: { select: { candidates: true } } },
  });
  return orderForReader(
    rows.filter((row) => stillWorthShowing(row, now)),
    now,
  );
}

export async function visibleElection(id: string) {
  const election = await prisma.election.findFirst({
    where: { id, hidden: false },
    select: {
      ...ELECTION_SELECT,
      candidates: { select: CANDIDATE_SELECT, orderBy: { order: "asc" as const } },
    },
  });
  if (!election) throw new NotFoundError(messages.notFound);
  return election;
}

export async function ballotsOf(userId: string, electionIds: string[]) {
  const rows = await prisma.electionBallot.findMany({
    where: { userId, electionId: { in: electionIds } },
    select: { electionId: true, candidateId: true },
  });
  return new Map(rows.map((row) => [row.electionId, row.candidateId]));
}

export async function myBallot(userId: string, electionId: string) {
  return prisma.electionBallot.findUnique({
    where: { electionId_userId: { electionId, userId } },
    select: { candidateId: true },
  });
}
