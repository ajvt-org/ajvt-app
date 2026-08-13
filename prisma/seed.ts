import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import { pgAdapterOptions } from "../src/lib/db-url";

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

async function main() {
  const hashed = await bcrypt.hash("admin123", 12);
  await prisma.admin.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: hashed },
  });
<<<<<<< HEAD
  console.log("✅ Admin: username=admin | password=admin123");

  for (const name of DEFAULT_AGE_GROUPS) {
    await prisma.ageGroup.upsert({ where: { name }, update: {}, create: { name } });
  }
  // Carry over any age already in use by a member (e.g. free-typed on the
  // membership form) that isn't part of the default list yet, so the
  // admin-managed list never misses a value real members already have.
  const usedAges = await prisma.member.findMany({ distinct: ["age"], select: { age: true } });
  for (const { age } of usedAges) {
    if (age) await prisma.ageGroup.upsert({ where: { name: age }, update: {}, create: { name: age } });
  }
  console.log("✅ Age groups seeded");
=======
  console.log("✅ Admin seed OK (username=admin)");
>>>>>>> 78760c65e79dedc8861442760f2f0ac923bd37d5
}

main().catch(console.error).finally(() => prisma.$disconnect());
