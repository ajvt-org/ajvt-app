import { prisma } from "./prisma";
import { paidUpMemberCount } from "./memberStanding";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { elections as messages } from "./messages";
import { electionState, validElectionMinutes } from "./election";
import { isForeignKeyViolation } from "./prismaError";

export type ElectionInput = {
  title: string;
  hidden: boolean;
  startsAt: string;
  durationMinutes: number;
  allowBlank: boolean;
  shuffleCandidates: boolean;
  showResults: boolean;
};

export type ElectionAction =
  | "CREATE_ELECTION"
  | "UPDATE_ELECTION"
  | "PUBLISH_ELECTION"
  | "HIDE_ELECTION"
  | "SHOW_ELECTION_RESULTS"
  | "HIDE_ELECTION_RESULTS"
  | "DELETE_ELECTION";

const LIST_INCLUDE = {
  candidates: {
    orderBy: { order: "asc" as const },
    include: { _count: { select: { ballots: true } } },
  },
  _count: { select: { ballots: true } },
};

const FROZEN_FIELDS = [
  "title",
  "startsAt",
  "durationMinutes",
  "allowBlank",
  "shuffleCandidates",
] as const;

export async function listElections() {
  return prisma.election.findMany({ orderBy: { createdAt: "desc" }, include: LIST_INCLUDE });
}

export async function requireElection(id: string) {
  const election = await prisma.election.findUnique({ where: { id }, include: LIST_INCLUDE });
  if (!election) throw new NotFoundError(messages.notFound);
  return election;
}

export function hasStarted(
  election: { startsAt: Date; durationMinutes: number },
  now = new Date(),
): boolean {
  return electionState(election, now) !== "upcoming";
}

function cleanTitle(value: unknown): string {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) throw new ValidationError(messages.titleRequired);
  return title;
}

function cleanStart(value: unknown, now: Date): Date {
  const startsAt = typeof value === "string" ? new Date(value) : new Date(NaN);
  if (Number.isNaN(startsAt.getTime())) throw new ValidationError(messages.startRequired);
  if (startsAt.getTime() < now.getTime() - 60_000) {
    throw new ValidationError(messages.startInPast);
  }
  return startsAt;
}

function cleanDuration(value: unknown): number {
  if (!validElectionMinutes(value)) throw new ValidationError(messages.durationInvalid);
  return Number(value);
}

export async function createElection(input: ElectionInput, now = new Date()) {
  return prisma.election.create({
    data: {
      title: cleanTitle(input.title),
      hidden: input.hidden,
      startsAt: cleanStart(input.startsAt, now),
      durationMinutes: cleanDuration(input.durationMinutes),
      allowBlank: input.allowBlank,
      shuffleCandidates: input.shuffleCandidates,
      showResults: input.showResults,
    },
    include: LIST_INCLUDE,
  });
}

function changedFrozenField(
  existing: {
    title: string;
    startsAt: Date;
    durationMinutes: number;
    allowBlank: boolean;
    shuffleCandidates: boolean;
  },
  input: Partial<ElectionInput>,
): boolean {
  return FROZEN_FIELDS.some((field) => {
    const sent = input[field];
    if (sent === undefined) return false;
    if (field === "startsAt")
      return new Date(sent as string).getTime() !== existing.startsAt.getTime();
    if (field === "title") return String(sent).trim() !== existing.title;
    return sent !== existing[field];
  });
}

function actionsFor(
  existing: { hidden: boolean; showResults: boolean },
  data: Partial<ElectionInput>,
): ElectionAction[] {
  const actions: ElectionAction[] = [];
  if (data.hidden !== undefined && data.hidden !== existing.hidden) {
    actions.push(data.hidden ? "HIDE_ELECTION" : "PUBLISH_ELECTION");
  }
  if (data.showResults !== undefined && data.showResults !== existing.showResults) {
    actions.push(data.showResults ? "SHOW_ELECTION_RESULTS" : "HIDE_ELECTION_RESULTS");
  }
  if (actions.length === 0) actions.push("UPDATE_ELECTION");
  return actions;
}

export async function updateElection(id: string, input: Partial<ElectionInput>, now = new Date()) {
  const existing = await requireElection(id);
  const started = hasStarted(existing, now);

  if (started && changedFrozenField(existing, input)) {
    throw new ConflictError(messages.alreadyStarted);
  }
  if (started && input.hidden !== undefined && input.hidden !== existing.hidden) {
    throw new ConflictError(messages.cannotHideAfterStart);
  }

  const data: Record<string, unknown> = {};
  if (input.showResults !== undefined) data.showResults = input.showResults;
  if (!started) {
    if (input.title !== undefined) data.title = cleanTitle(input.title);
    if (input.startsAt !== undefined) data.startsAt = cleanStart(input.startsAt, now);
    if (input.durationMinutes !== undefined)
      data.durationMinutes = cleanDuration(input.durationMinutes);
    if (input.allowBlank !== undefined) data.allowBlank = input.allowBlank;
    if (input.shuffleCandidates !== undefined) data.shuffleCandidates = input.shuffleCandidates;
    if (input.hidden !== undefined) data.hidden = input.hidden;
  }

  const actions = actionsFor(existing, input);
  const election = await prisma.election.update({ where: { id }, data, include: LIST_INCLUDE });
  return { election, actions };
}

export async function deleteElection(id: string) {
  const election = await requireElection(id);
  if (!election.hidden) throw new ConflictError(messages.cannotDeleteVisible);
  if (election._count.ballots > 0) throw new ConflictError(messages.cannotDeleteVoted);

  await prisma.election.delete({ where: { id } });
  return election;
}

function cleanName(value: unknown): string {
  const fullName = typeof value === "string" ? value.trim() : "";
  if (!fullName) throw new ValidationError(messages.candidateNameRequired);
  return fullName;
}

async function editableElection(id: string, now: Date) {
  const election = await requireElection(id);
  if (hasStarted(election, now)) throw new ConflictError(messages.candidatesFrozen);
  return election;
}

export async function addCandidate(
  electionId: string,
  input: { fullName: string; photo?: string | null },
  now = new Date(),
) {
  const election = await editableElection(electionId, now);
  const last = await prisma.electionCandidate.findFirst({
    where: { electionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return prisma.electionCandidate.create({
    data: {
      electionId: election.id,
      fullName: cleanName(input.fullName),
      photo: input.photo ?? null,
      order: (last?.order ?? -1) + 1,
    },
  });
}

async function requireCandidate(electionId: string, candidateId: string) {
  const candidate = await prisma.electionCandidate.findFirst({
    where: { id: candidateId, electionId },
  });
  if (!candidate) throw new NotFoundError(messages.candidateNotFound);
  return candidate;
}

export async function updateCandidate(
  electionId: string,
  candidateId: string,
  input: { fullName?: string; photo?: string | null },
  now = new Date(),
) {
  await editableElection(electionId, now);
  await requireCandidate(electionId, candidateId);

  const data: { fullName?: string; photo?: string | null } = {};
  if (input.fullName !== undefined) data.fullName = cleanName(input.fullName);
  if (input.photo !== undefined) data.photo = input.photo;

  return prisma.electionCandidate.update({ where: { id: candidateId }, data });
}

export async function deleteCandidate(electionId: string, candidateId: string, now = new Date()) {
  await editableElection(electionId, now);
  const candidate = await requireCandidate(electionId, candidateId);

  try {
    await prisma.electionCandidate.delete({ where: { id: candidateId } });
  } catch (err) {
    if (isForeignKeyViolation(err)) throw new ConflictError(messages.candidateHasBallots);
    throw err;
  }
  return candidate;
}

export async function electionTally(electionId: string) {
  const election = await requireElection(electionId);
  const [electorate, blank] = await Promise.all([
    paidUpMemberCount(),
    prisma.electionBallot.count({ where: { electionId, candidateId: null } }),
  ]);

  return {
    electorate,
    cast: election._count.ballots,
    blank,
    rows: election.candidates.map((candidate) => ({
      candidateId: candidate.id,
      fullName: candidate.fullName,
      photo: candidate.photo,
      votes: candidate._count.ballots,
    })),
  };
}
