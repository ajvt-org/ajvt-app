import { Client } from "pg";
import {
  API_TEST_DATABASES,
  claimKey,
  maintenanceDatabase,
  workerDatabase,
} from "../localDatabase.mjs";

export async function claimDatabase(baseUrl: string): Promise<string> {
  const client = new Client({ connectionString: maintenanceDatabase(baseUrl) });
  await client.connect();
  (client as unknown as { connection: { stream: { unref(): void } } }).connection.stream.unref();

  const key = claimKey(baseUrl);

  for (;;) {
    for (let slot = 1; slot <= API_TEST_DATABASES; slot += 1) {
      const held = await client.query<{ ok: boolean }>(
        "SELECT pg_try_advisory_lock($1, $2) AS ok",
        [key, slot],
      );
      if (held.rows[0].ok) return workerDatabase(baseUrl, slot);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
