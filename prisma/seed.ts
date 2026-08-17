import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import { pgAdapterOptions } from "../src/lib/db-url";
import { initialAdminPassword } from "../src/lib/initialAdminPassword";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg(pgAdapterOptions(dbUrl));
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const DEFAULT_AGE_GROUPS = [
  "البدريين",
  "الفائزين",
  "النجميين",
  "المجاهدين",
  "المنصورين",
  "الخاشعين",
  "التائبين",
];

async function seedAdmin() {
  const existing = await prisma.admin.findUnique({ where: { username: "admin" } });
  if (existing) {
    console.log("Admin already exists, password left alone");
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
    await prisma.ageGroup.upsert({ where: { name }, update: {}, create: { name } });
  }
  const usedAges = await prisma.member.findMany({ distinct: ["age"], select: { age: true } });
  for (const { age } of usedAges) {
    if (age)
      await prisma.ageGroup.upsert({ where: { name: age }, update: {}, create: { name: age } });
  }
  console.log("Age groups seeded");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
