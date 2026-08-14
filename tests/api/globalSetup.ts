import { execSync } from "node:child_process";
import { Client } from "pg";

export default async function setup() {
  const url = new URL(process.env.DATABASE_URL as string);
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

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url.toString() },
  });
}
