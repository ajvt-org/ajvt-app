import { execSync } from "node:child_process";
import { Client } from "pg";
import { localDatabase } from "../localDatabase";

async function prepare() {
  const url = new URL(process.env.E2E_DATABASE_URL ?? localDatabase("ajvt_e2e"));
  const database = url.pathname.slice(1);

  const maintenance = new URL(url.toString());
  maintenance.pathname = "/postgres";

  const client = new Client({ connectionString: maintenance.toString() });
  await client.connect();
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE "${database}"`);
  }
  await client.end();

  const env = { ...process.env, DATABASE_URL: url.toString() };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });

  const fresh = new Client({ connectionString: url.toString() });
  await fresh.connect();
  await fresh.query(
    `TRUNCATE "Member", "User", "Admin", "AgeGroup", "AuditLog", "Donation" RESTART IDENTITY CASCADE`,
  );
  await fresh.end();

  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
}

prepare().catch((err) => {
  console.error(err);
  process.exit(1);
});
