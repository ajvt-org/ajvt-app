import { execSync, spawn } from "child_process";
import { mkdirSync } from "fs";
import { createRequire } from "module";
import { startHoldingServer } from "./holdingServer.mjs";

const uploadDir = process.env.UPLOAD_DIR || "public/uploads";
mkdirSync(uploadDir, { recursive: true });

const port = Number(process.env.PORT) || 3000;

// Migrations and seeding below block on purpose (see the next comment), which
// used to leave the port closed the whole time and show as a 502. This holds
// it open instead, answering /api/health as unhealthy until it closes.
console.log("→ Holding the port during boot...");
const holding = await startHoldingServer(port);

console.log("→ Running database migrations...");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

console.log("→ Seeding admin (skipped if exists)...");
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

console.log("→ Issuing receipts for accepted payments (skipped if none)...");
execSync("npx tsx prisma/backfillReceipts.ts", { stdio: "inherit" });

await new Promise((resolve) => holding.close(resolve));

// The two steps above are boot work and block on purpose: nothing serves a
// request before the database matches the code. This one is the server, and it
// differs on both counts. It is spawned, not run synchronously, so the SIGTERM
// the platform sends on every deploy reaches Next and lets it drain what is in
// flight rather than stopping at this script and severing it. And node runs
// Next's own entry point rather than `npx next start`, which would put an npx
// process and a shell in between for the signal to stop at instead.
//
// The child's exit code is passed on, so a crash still reads as a failure to
// the platform rather than as a clean exit.
console.log("→ Starting Next.js...");
const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
const server = spawn(process.execPath, [next, "start"], { stdio: "inherit" });

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server.kill(signal);
  });
}

server.on("exit", (code, signal) => {
  if (signal) {
    // Re-raise so the parent's own exit status is the signal, not a code. The
    // listener has to go first or the handler above would catch it again.
    process.removeAllListeners(signal);
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
