import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const LOCAL = "postgresql://ajvt:ajvt@localhost:5433";

function checkoutHash(): string {
  return createHash("sha1").update(process.cwd()).digest("hex").slice(0, 6);
}

export function localDatabase(base: string): string {
  return `${LOCAL}/${base}_${checkoutHash()}`;
}

export function localPort(base: number, span: number): number {
  const start = base + (parseInt(checkoutHash(), 16) % span);
  const script = join(process.cwd(), "tests", "freePort.mjs");
  const found = execFileSync(process.execPath, [script, String(start), String(span)], {
    encoding: "utf8",
  });
  return Number(found);
}
