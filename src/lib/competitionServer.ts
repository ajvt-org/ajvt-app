import { prisma } from "./prisma";
import {
  DEFAULT_CONFIG,
  validateConfig,
  type CompetitionConfig,
  type SpeedBand,
} from "./competitionConfig";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

export const ALREADY_STARTED = "المسابقة انطلقت، لا يمكن تعديل إعداداتها";
export const NO_COMPETITION = "لا توجد مسابقة";

export async function getCompetition() {
  return prisma.competition.findFirst({ orderBy: { createdAt: "desc" } });
}

export async function requireCompetition() {
  const competition = await getCompetition();
  if (!competition) throw new NotFoundError(NO_COMPETITION);
  return competition;
}

function asConfig(row: {
  name: string;
  startsOn: string;
  days: number;
  publishMinutes: number;
  cutoffMinutes: number;
  servedCount: number;
  poolSize: number;
  weeklyCountingDays: number;
  speedBands: unknown;
}): CompetitionConfig {
  return { ...row, speedBands: row.speedBands as SpeedBand[] };
}

export async function saveCompetition(input: Partial<CompetitionConfig>) {
  const existing = await getCompetition();
  if (existing?.startedAt) throw new ConflictError(ALREADY_STARTED);

  const merged: CompetitionConfig = {
    ...DEFAULT_CONFIG,
    name: "",
    startsOn: "",
    ...(existing ? asConfig(existing) : {}),
    ...input,
  };

  const problem = validateConfig(merged);
  if (problem) throw new ValidationError(problem);

  const data = { ...merged, speedBands: merged.speedBands as unknown as object };
  if (existing) return prisma.competition.update({ where: { id: existing.id }, data });
  return prisma.competition.create({ data });
}

export async function startCompetition(now = new Date()) {
  const competition = await requireCompetition();
  if (competition.startedAt) throw new ConflictError(ALREADY_STARTED);
  return prisma.competition.update({
    where: { id: competition.id },
    data: { startedAt: now },
  });
}

export async function resetCompetitionScores() {
  const competition = await getCompetition();
  if (competition?.startedAt) throw new ConflictError(ALREADY_STARTED);
  const { count } = await prisma.quizAssignment.updateMany({
    where: { pointsAwarded: { gt: 0 } },
    data: { pointsAwarded: 0 },
  });
  return count;
}
