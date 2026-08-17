import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { activities } from "./messages";

export async function resolveDonationActivity(
  activityId: string | null | undefined,
): Promise<string | null> {
  if (!activityId) return null;
  const found = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true },
  });
  if (!found) throw new ValidationError(activities.notFound);
  return found.id;
}
