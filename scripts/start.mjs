import { execSync, spawn } from "child_process";
import { createRequire } from "module";
import { startHoldingServer } from "./holdingServer.mjs";

console.log("→ Preparing the upload directory...");
execSync("npx tsx scripts/prepareUploadDir.ts", { stdio: "inherit" });

const port = Number(process.env.PORT) || 3000;

console.log("→ Holding the port during boot...");
const holding = await startHoldingServer(port);

console.log("→ Running database migrations...");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

console.log("→ Seeding admin (skipped if exists)...");
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

console.log("→ Issuing receipts for accepted payments (skipped if none)...");
execSync("npx tsx prisma/backfillReceipts.ts", { stdio: "inherit" });

await new Promise((resolve) => holding.close(resolve));

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
    process.removeAllListeners(signal);
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
