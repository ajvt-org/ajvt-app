import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

function stripSslMode(url: string): string {
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  return u.toString();
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({
  connectionString: stripSslMode(dbUrl),
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const hashed = await bcrypt.hash("admin123", 12);
  await prisma.admin.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: hashed },
  });
  console.log("✅ Admin: username=admin | password=admin123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
