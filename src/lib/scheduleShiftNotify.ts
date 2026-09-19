import { prisma } from "./prisma";
import { notify } from "./messages";
import { notifyActivityFollowers } from "./tournamentNotify";

export async function announceScheduleShift(activityId: string, shifted: number) {
  if (shifted <= 0) return;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { title: true },
  });
  if (!activity) return;

  await notifyActivityFollowers(activityId, notify.scheduleShifted(activity.title, activityId));
}
