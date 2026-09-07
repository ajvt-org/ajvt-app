import { execSync } from "node:child_process";
import { Client } from "pg";
import {
  API_TEST_DATABASES,
  claimKey,
  databaseName,
  maintenanceDatabase,
  templateDatabase,
  workerDatabase,
} from "../localDatabase.mjs";

export default async function setup() {
  const base = process.env.TEST_DATABASE_BASE_URL as string;
  const template = templateDatabase(base);
  const templateName = databaseName(template);

  const client = new Client({ connectionString: maintenanceDatabase(base) });
  await client.connect();

  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    templateName,
  ]);
  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE "${templateName}"`);
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: template },
  });

  const key = claimKey(base);

  for (let slot = 1; slot <= API_TEST_DATABASES; slot += 1) {
    const free = await client.query<{ ok: boolean }>("SELECT pg_try_advisory_lock($1, $2) AS ok", [
      key,
      slot,
    ]);
    if (!free.rows[0].ok) continue;

    const name = databaseName(workerDatabase(base, slot));
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${name}" TEMPLATE "${templateName}"`);
    await client.query("SELECT pg_advisory_unlock($1, $2)", [key, slot]);
  }

  await client.end();
}
