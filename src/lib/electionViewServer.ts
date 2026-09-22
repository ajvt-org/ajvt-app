import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { elections as messages } from "./messages";
import { electionState, orderForReader, stillWorthShowing } from "./election";
import { paidUpMemberCount } from "./memberStanding";
import { isUniqueViolation } from "./prismaError";

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

export async function castBallot(electionId: string, userId: string, candidateId: string | null) {
  const election = await prisma.election.findFirst({
    where: { id: electionId, hidden: false },
    select: { ...ELECTION_SELECT, candidates: { select: { id: true } } },
  });
  if (!election) throw new NotFoundError(messages.notFound);

  const state = electionState(election);
  if (state === "upcoming") throw new ConflictError(messages.notOpenYet);
  if (state === "ended") throw new ConflictError(messages.alreadyClosed);

  if (candidateId === null) {
    if (!election.allowBlank) throw new ValidationError(messages.blankNotAllowed);
  } else if (!election.candidates.some((candidate) => candidate.id === candidateId)) {
    throw new ValidationError(messages.unknownCandidate);
  }

  try {
    return await prisma.electionBallot.create({ data: { electionId, userId, candidateId } });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ConflictError(messages.alreadyVoted);
    throw err;
  }
}

export async function publishedResult(election: {
  id: string;
  startsAt: Date;
  durationMinutes: number;
  showResults: boolean;
}) {
  if (!election.showResults) return null;
  if (electionState(election) !== "ended") return null;

  const [rows, electorate, cast, blank] = await Promise.all([
    prisma.electionCandidate.findMany({
      where: { electionId: election.id },
      orderBy: { order: "asc" },
      select: { id: true, fullName: true, photo: true, _count: { select: { ballots: true } } },
    }),
    paidUpMemberCount(),
    prisma.electionBallot.count({ where: { electionId: election.id } }),
    prisma.electionBallot.count({ where: { electionId: election.id, candidateId: null } }),
  ]);

  return {
    electorate,
    cast,
    blank,
    rows: rows.map((row) => ({
      candidateId: row.id,
      fullName: row.fullName,
      photo: row.photo,
      votes: row._count.ballots,
    })),
  };
}
