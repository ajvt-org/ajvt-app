import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { expenses as messages } from "./messages";
import { resolveMoneyDestination } from "./moneyDestinationServer";
import { sharesMatchTotal, type DestinationShare } from "./expenseSplit";

export interface ShareInput {
  activityId?: string | null;
  competitionId?: string | null;
  amount: unknown;
}

function keyOf(share: DestinationShare): string {
  return share.activityId ?? share.competitionId ?? "";
}

export async function resolveShares(
  shares: ShareInput[],
  total: number,
): Promise<DestinationShare[]> {
  const resolved: DestinationShare[] = [];
  for (const share of shares) {
    const destination = await resolveMoneyDestination({
      activityId: share.activityId,
      competitionId: share.competitionId,
    });
    resolved.push({ ...destination, amount: Number(share.amount) });
  }

  const keys = resolved.map(keyOf);
  if (new Set(keys).size !== keys.length) {
    throw new ValidationError(messages.destinationRepeated);
  }
  if (!sharesMatchTotal(resolved, total)) {
    throw new ValidationError(messages.sharesDoNotMatch);
  }
  return resolved;
}

export async function sharesForUpdate(input: {
  id: string;
  total: number;
  allocations?: ShareInput[];
  destinationGiven: boolean;
  destination: { activityId?: string | null; competitionId?: string | null };
  amountGiven: boolean;
}): Promise<DestinationShare[] | null> {
  const { id, total, allocations, destinationGiven, destination, amountGiven } = input;

  if (allocations !== undefined) return resolveShares(allocations, total);

  if (destinationGiven) {
    const resolved = await resolveMoneyDestination(destination);
    return [{ ...resolved, amount: total }];
  }

  if (!amountGiven) return null;

  const held = await prisma.expenseAllocation.findMany({
    where: { expenseId: id },
    select: { activityId: true, competitionId: true },
  });
  if (held.length > 1) throw new ValidationError(messages.sharesDoNotMatch);

  const only = held[0] ?? { activityId: null, competitionId: null };
  return [{ activityId: only.activityId, competitionId: only.competitionId, amount: total }];
}
