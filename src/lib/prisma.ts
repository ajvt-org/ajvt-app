import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Render's Postgres presents a self-signed cert; sslmode in the connection
// string (require/prefer/verify-ca) gets aliased to verify-full by pg and
// overrides an explicit `ssl` option, so it must be stripped here — the
// `ssl: { rejectUnauthorized: false }` below is what actually governs TLS.
function stripSslMode(url: string): string {
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  return u.toString();
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set");

  const adapter = new PrismaPg({
    connectionString: stripSslMode(dbUrl),
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
