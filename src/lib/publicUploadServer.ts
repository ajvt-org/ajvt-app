import { prisma } from "./prisma";
import { CONFIDENTIAL_SELECT, nameIsConfidential } from "./supportPrivacy";

export async function activityPhotoIsInUse(photo: string): Promise<boolean> {
  const activity = await prisma.activity.findFirst({ where: { photo }, select: { id: true } });
  return activity !== null;
}

export async function memberPhotoIsInUse(photo: string): Promise<boolean> {
  const person = await prisma.user.findFirst({ where: { photo }, select: { id: true } });
  return person !== null;
}

export async function teamLogoIsInUse(logo: string): Promise<boolean> {
  const team = await prisma.team.findFirst({ where: { logo }, select: { id: true } });
  return team !== null;
}

export async function donorPhotoIsPublic(donorPhoto: string): Promise<boolean> {
  const payment = await prisma.payment.findFirst({
    where: { donorPhoto },
    select: { userId: true, user: { select: CONFIDENTIAL_SELECT } },
  });
  return payment !== null && !nameIsConfidential(payment);
}
