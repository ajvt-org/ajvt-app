import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import { pgAdapterOptions } from "../src/lib/db-url";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg(pgAdapterOptions(dbUrl));
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const hashed = await bcrypt.hash("admin123", 12);
  await prisma.admin.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: hashed },
  });
  console.log("✅ Admin seed OK (username=admin)");
}

main().catch(console.error).finally(() => prisma.$disconnect());
