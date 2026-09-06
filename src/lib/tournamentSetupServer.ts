import { prisma } from "./prisma";
import { ConflictError, ValidationError } from "./errors";
import { entrantWording, tournament as messages } from "./messages";
import { entrantOfActivity } from "./entrantServer";
import type { EntrantWording } from "./messages";
import { bracketRoundLabel } from "./tournament";
import { groupRoundRobin, groupRoundSizes } from "./tournamentFixtures";
import { knockoutRoundSizes } from "./knockoutSlots";
import { planTournament } from "./tournamentPlan";
import { isValidGroupShape } from "./tournamentShape";
import { setupLabels } from "./texts/setupWizard";
import { sideIdData } from "./matchSides";

export interface SetupGroup {
  name: string;
  teamIds: string[];
}

export interface SetupInput {
  format: "KNOCKOUT" | "GROUPS_THEN_KNOCKOUT";
  groups: SetupGroup[];
  qualifierCount: number;
  startsAt: Date;
  times: string[];
  venue: string | null;
}

export interface SetupResult {
  groupMatches: number;
  knockoutMatches: number;
  days: number;
}

async function assertNothingPlayed(activityId: string) {
  const played = await prisma.match.count({ where: { activityId, status: "PLAYED" } });
  if (played > 0) throw new ConflictError(messages.setupHasResults(played));
}

function checkGroupShape(input: SetupInput, teamCount: number, words: EntrantWording) {
  const placed = input.groups.flatMap((g) => g.teamIds);
  if (placed.length !== teamCount || new Set(placed).size !== teamCount) {
    throw new ValidationError(words.everyEntrantInOneGroup);
  }
  if (!isValidGroupShape(teamCount, input.groups.length, input.qualifierCount)) {
    throw new ValidationError(messages.setupShapeInvalid);
  }
  const size = teamCount / input.groups.length;
  if (input.groups.some((g) => g.teamIds.length !== size)) {
    throw new ValidationError(messages.setupGroupsUneven);
  }
}

export async function setUpTournament(activityId: string, input: SetupInput): Promise<SetupResult> {
  const teams = await prisma.team.findMany({
    where: { activityId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const words = entrantWording(await entrantOfActivity(prisma, activityId));
  if (teams.length < 2) throw new ValidationError(words.setupNeedsTwoEntrants);

  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: { matchShape: true },
  });
  const shape = activity.matchShape;

  await assertNothingPlayed(activityId);

  const grouped = input.format === "GROUPS_THEN_KNOCKOUT";
  if (grouped) checkGroupShape(input, teams.length, words);

  const entries = input.groups.map((g, index) => ({ index, teamIds: g.teamIds }));
  const groupFixtures = grouped ? groupRoundRobin(entries) : [];
  const roundSizes = groupRoundSizes(groupFixtures);
  const qualifierCount = grouped ? input.qualifierCount : teams.length;
  const bracketSizes = knockoutRoundSizes(qualifierCount);

  const plan = planTournament({
    startsAt: input.startsAt,
    times: input.times,
    groupRoundSizes: roundSizes,
    qualifierCount,
  });
  const groupSlots = plan.slots.filter((s) => s.stage === "GROUP");
  const bracketSlots = plan.slots.filter((s) => s.stage === "KNOCKOUT");

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { activityId } });
    await tx.team.updateMany({ where: { activityId }, data: { groupId: null } });
    await tx.group.deleteMany({ where: { activityId } });
    await tx.tournamentDay.deleteMany({ where: { activityId } });

    const dayIds = new Map<number, string>();
    for (let position = 1; position <= plan.dayCount; position++) {
      const day = await tx.tournamentDay.create({
        data: { activityId, position, isRest: false },
      });
      dayIds.set(position, day.id);
    }

    const groupIds: string[] = [];
    for (const group of input.groups) {
      const created = await tx.group.create({
        data: { activityId, name: group.name, capacity: group.teamIds.length },
      });
      groupIds.push(created.id);
      await tx.team.updateMany({
        where: { activityId, id: { in: group.teamIds } },
        data: { groupId: created.id },
      });
    }

    let order = 1;
    for (const [i, fixture] of groupFixtures.entries()) {
      const slot = groupSlots[i];
      await tx.match.create({
        data: {
          activityId,
          ...sideIdData(shape, fixture.firstTeamId, fixture.secondTeamId),
          round: setupLabels.groupRound(input.groups[fixture.groupIndex].name, fixture.round),
          order: order++,
          venue: input.venue,
          dayId: dayIds.get(slot.dayPosition) ?? null,
          matchDate: slot.kickOff,
        },
      });
    }

    let placed = 0;
    for (const [round, size] of bracketSizes.entries()) {
      const label = bracketRoundLabel(size);
      for (let i = 0; i < size; i++) {
        const slot = bracketSlots[placed++];
        await tx.match.create({
          data: {
            activityId,
            isKnockout: true,
            bracketRound: round + 1,
            round: label,
            order: order++,
            venue: input.venue,
            dayId: dayIds.get(slot.dayPosition) ?? null,
            matchDate: slot.kickOff,
          },
        });
      }
    }

    await tx.activity.update({
      where: { id: activityId },
      data: {
        format: input.format,
        startsAt: input.startsAt,
        endsAt: plan.endsAt,
        withTime: input.times.length === 1,
      },
    });
  });

  return {
    groupMatches: groupFixtures.length,
    knockoutMatches: bracketSlots.length,
    days: plan.dayCount,
  };
}
