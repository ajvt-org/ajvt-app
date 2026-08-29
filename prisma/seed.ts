import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import { pgAdapterOptions } from "../src/lib/db-url";
import {
  defaultPasswordVerdict,
  initialAdminPassword,
  LOCAL_DEFAULT_PASSWORD,
  suppliedAdminPassword,
} from "../src/lib/initialAdminPassword";
import { seedAdminAction } from "../src/lib/adminSeed";
import { HOME_VILLAGE } from "../src/lib/villages";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg(pgAdapterOptions(dbUrl));
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const DEFAULT_VILLAGES = [HOME_VILLAGE, "أفجار"];

const DEFAULT_AGE_GROUPS = [
  "البدريين",
  "الفائزين",
  "النجميين",
  "المجاهدين",
  "المنصورين",
  "الخاشعين",
  "التائبين",
];

const STILL_DEFAULT =
  "SECURITY: the admin account still has the password that ships with this repo. " +
  "Set ADMIN_INITIAL_PASSWORD and deploy again to replace it.";

async function retireDefaultPassword(current: { id: string; password: string }) {
  const supplied = suppliedAdminPassword(process.env);
  const usesDefault = await bcrypt.compare(LOCAL_DEFAULT_PASSWORD, current.password);
  const verdict = defaultPasswordVerdict({ usesDefault, supplied });

  if (verdict.action === "keep") {
    console.log("Admin already exists, password left alone");
    return;
  }
  if (verdict.action === "warn") {
    console.warn(STILL_DEFAULT);
    return;
  }
  await prisma.admin.update({
    where: { id: current.id },
    data: { password: await bcrypt.hash(verdict.password, 12) },
  });
  console.log("Admin had the default password, replaced with ADMIN_INITIAL_PASSWORD");
}

async function seedAdmin() {
  const existing = await prisma.admin.findUnique({ where: { username: "admin" } });
  const action = seedAdminAction({
    defaultAdminExists: existing !== null,
    adminCount: await prisma.admin.count(),
  });

  if (existing && action === "retire") {
    await retireDefaultPassword(existing);
    return;
  }
  if (action === "skip") {
    console.log("Admins already exist, none created");
    return;
  }

  const password = initialAdminPassword(process.env);
  await prisma.admin.create({
    data: { username: "admin", password: await bcrypt.hash(password, 12) },
  });
  console.log("Admin created: username=admin");
}

async function main() {
  await seedAdmin();

  for (const name of DEFAULT_AGE_GROUPS) {
    await prisma.ageGroup.upsert({
      where: { name },
      update: { approved: true },
      create: { name, approved: true },
    });
  }
  for (const name of DEFAULT_VILLAGES) {
    await prisma.village.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("Age groups and villages seeded");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
