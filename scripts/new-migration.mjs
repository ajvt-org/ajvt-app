import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "prisma", "migrations");
const STAMP = /^(\d{14})_/;

function stampNow() {
  return new Date().toISOString().replace(/\D/g, "").slice(0, 14);
}

function lastStamp() {
  const stamps = readdirSync(DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name.match(STAMP)?.[1])
    .filter((stamp) => stamp !== undefined)
    .sort();
  return stamps.at(-1) ?? "";
}

function oneSecondAfter(stamp) {
  const at = Date.UTC(
    Number(stamp.slice(0, 4)),
    Number(stamp.slice(4, 6)) - 1,
    Number(stamp.slice(6, 8)),
    Number(stamp.slice(8, 10)),
    Number(stamp.slice(10, 12)),
    Number(stamp.slice(12, 14)) + 1,
  );
  return new Date(at).toISOString().replace(/\D/g, "").slice(0, 14);
}

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error("Usage: npm run db:new-migration -- <lower_snake_case_name>");
  process.exit(1);
}

const now = stampNow();
const last = lastStamp();
const stamp = now > last ? now : oneSecondAfter(last);
if (stamp !== now) {
  console.log(`The tree is dated ahead of the clock. Using ${stamp}, one second after ${last}.`);
}

const folder = join(DIR, `${stamp}_${name}`);
mkdirSync(folder, { recursive: true });
writeFileSync(join(folder, "migration.sql"), "", "utf-8");
console.log(folder.replace(`${process.cwd()}/`, ""));
