import * as bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { admins as messages } from "./messages";
import { outranks } from "./adminRoles";

const ROUNDS = 12;

export async function adminRows(viewerRole: string) {
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      activities: { select: { activity: { select: { id: true, title: true } } } },
      lastLoginAt: true,
      lastLoginIp: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return admins.map(({ activities, ...admin }) =>
    outranks(admin.role, viewerRole)
      ? { id: admin.id, username: admin.username }
      : { ...admin, activities: activities.map((link) => link.activity) },
  );
}

export async function createAdmin(username: string, password: string, role: string) {
  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) throw new ConflictError(messages.usernameTaken);

  return prisma.admin.create({
    data: { username, password: await bcrypt.hash(password, ROUNDS), role },
    select: { id: true, username: true, role: true, createdAt: true },
  });
}

export async function adminOrNotFound(id: string) {
  const admin = await prisma.admin.findUnique({
    where: { id },
    select: { username: true, role: true, lastLoginAt: true, createdAt: true },
  });
  if (!admin) throw new NotFoundError(messages.notFound);
  return admin;
}

export async function refuseLastAdmin(): Promise<void> {
  if ((await prisma.admin.count()) <= 1) throw new ValidationError(messages.cannotDeleteLast);
}

export async function removeAdmin(id: string): Promise<void> {
  await prisma.admin.delete({ where: { id } });
}
