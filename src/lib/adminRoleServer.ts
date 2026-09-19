import { prisma } from "./prisma";
import { NotFoundError, ValidationError } from "./errors";
import { admins as messages } from "./messages";
import { OWNER_ROLE } from "./adminRoles";
import { SCOPED_ROLE } from "./activityAccess";
import { leavesScope, strandsOwnerRole } from "./adminRoleChange";

export async function scopedAdminOrNotFound(id: string) {
  const admin = await prisma.admin.findUnique({
    where: { id },
    select: { username: true, role: true, activities: { select: { activityId: true } } },
  });
  if (!admin) throw new NotFoundError(messages.notFound);
  return admin;
}

export async function refuseStrandingTheLastOwner(held: string, role: string): Promise<void> {
  const owners = await prisma.admin.count({ where: { role: OWNER_ROLE } });
  if (strandsOwnerRole(held, role, owners)) {
    throw new ValidationError(messages.cannotDemoteLastOwner);
  }
}

export async function saveAdminRole(id: string, held: string, role: string) {
  const clearing = leavesScope(held, role);

  await prisma.$transaction([
    ...(clearing ? [prisma.adminActivity.deleteMany({ where: { adminId: id } })] : []),
    prisma.admin.update({ where: { id }, data: { role } }),
  ]);

  return clearing;
}

export async function setAdminActivities(id: string, activityIds: string[]): Promise<void> {
  const found = await prisma.activity.findMany({
    where: { id: { in: activityIds } },
    select: { id: true },
  });
  if (found.length !== activityIds.length) throw new ValidationError(messages.activityNotFound);

  await prisma.$transaction([
    prisma.adminActivity.deleteMany({ where: { adminId: id } }),
    prisma.adminActivity.createMany({
      data: activityIds.map((activityId) => ({ adminId: id, activityId })),
    }),
    prisma.admin.update({
      where: { id },
      data: { role: SCOPED_ROLE, tokenVersion: { increment: 1 } },
    }),
  ]);
}
