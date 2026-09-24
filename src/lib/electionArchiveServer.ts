import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { elections as messages } from "./messages";
import { electionState } from "./election";
import { archiveEntry, confirmationMatches } from "./deletedRecords";

type ArchivedBallot = { userId: string } & Record<string, unknown>;

type ArchivedElection = {
  candidates?: Record<string, unknown>[];
  ballots?: ArchivedBallot[];
} & Record<string, unknown>;

export async function deleteElection(id: string, typed: string, by: string, now = new Date()) {
  const election = await prisma.election.findUnique({
    where: { id },
    include: { candidates: true, ballots: true },
  });
  if (!election) throw new NotFoundError(messages.notFound);
  if (electionState(election, now) === "open" && !confirmationMatches(typed, election.title)) {
    throw new ValidationError(messages.confirmByTitle);
  }

  const entry = archiveEntry(
    "Election",
    id,
    election.title,
    election as unknown as Prisma.InputJsonValue,
    by,
    now,
  );
  await prisma.$transaction([
    prisma.deletedRecord.create({ data: entry }),
    prisma.electionBallot.deleteMany({ where: { electionId: id } }),
    prisma.election.delete({ where: { id } }),
  ]);
  return election;
}

async function stillPresent(ballots: ArchivedBallot[]): Promise<ArchivedBallot[]> {
  const voters = await prisma.user.findMany({
    where: { id: { in: ballots.map((ballot) => ballot.userId) } },
    select: { id: true },
  });
  const present = new Set(voters.map((voter) => voter.id));
  return ballots.filter((ballot) => present.has(ballot.userId));
}

export async function restoreElection(id: string, recordId: string, data: Record<string, unknown>) {
  const taken = await prisma.election.findUnique({ where: { id: recordId }, select: { id: true } });
  if (taken) throw new ConflictError(messages.alreadyRestored);

  const { candidates = [], ballots = [], ...fields } = data as ArchivedElection;
  const kept = await stillPresent(ballots);

  await prisma.$transaction([
    prisma.election.create({ data: fields as never }),
    prisma.electionCandidate.createMany({ data: candidates as never }),
    prisma.electionBallot.createMany({ data: kept as never }),
    prisma.deletedRecord.delete({ where: { id } }),
  ]);
}
