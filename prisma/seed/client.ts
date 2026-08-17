import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { pgAdapterOptions } from "../../src/lib/db-url";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");

const host = new URL(dbUrl).hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
  throw new Error(`Refusing to run: DATABASE_URL points at "${host}", not a local database`);
}

const adapter = new PrismaPg(pgAdapterOptions(dbUrl));

export const prisma = new PrismaClient({ adapter } as ConstructorParameters<
  typeof PrismaClient
>[0]);
