import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const LOCAL = "postgresql://ajvt:ajvt@localhost:5433";

export const API_TEST_WORKERS = Number(process.env.API_TEST_WORKERS) || 4;

export const API_TEST_DATABASES = API_TEST_WORKERS + 1;

function checkoutHash(): string {
  return createHash("sha1").update(process.cwd()).digest("hex").slice(0, 6);
}

export function localDatabase(base: string): string {
  return `${LOCAL}/${base}_${checkoutHash()}`;
}

function suffixed(baseUrl: string, suffix: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname}_${suffix}`;
  return url.toString();
}

export function templateDatabase(baseUrl: string): string {
  return suffixed(baseUrl, "template");
}

export function workerDatabase(baseUrl: string, slot: number): string {
  return suffixed(baseUrl, `w${slot}`);
}

export function maintenanceDatabase(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

export function databaseName(url: string): string {
  return new URL(url).pathname.slice(1);
}

export function claimKey(baseUrl: string): number {
  return createHash("sha1").update(databaseName(baseUrl)).digest().readInt32BE(0);
}

export function localPort(base: number, span: number): number {
  const start = base + (parseInt(checkoutHash(), 16) % span);
  const script = join(process.cwd(), "tests", "freePort.mjs");
  const found = execFileSync(process.execPath, [script, String(start), String(span)], {
    encoding: "utf8",
  });
  return Number(found);
}
