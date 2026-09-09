import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PLATFORM = /toLocaleDateString|toLocaleTimeString|toLocaleString|Intl\.DateTimeFormat/;

const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const ALLOWED: Record<string, string> = {
  "src/lib/clubTime.ts":
    "the one home for the date family. It is where the club's timezone is applied and where the Arabic weekday and month names are read from the platform rather than written down.",
};

const ADVICE = "Draw it through src/lib/clubTime.ts instead, and read docs/dates.md.";

function sourceFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    if (!/\.tsx?$/.test(entry.name)) return [];
    if (/\.(test|ui\.test)\.tsx?$/.test(entry.name)) return [];
    return [child];
  });
}

function offenders(hit: (source: string) => boolean): string[] {
  return sourceFiles("src")
    .filter((path) => !(path in ALLOWED))
    .filter((path) => hit(readFileSync(path, "utf8")));
}

describe("where a date is built", () => {
  it("asks the platform for a date in one file and nowhere else", () => {
    expect(
      offenders((source) => PLATFORM.test(source)),
      ADVICE,
    ).toEqual([]);
  });

  it("lets no file keep a table of the Arabic month names", () => {
    expect(
      offenders((source) => MONTHS.filter((month) => source.includes(month)).length > 2),
      ADVICE,
    ).toEqual([]);
  });

  it("allows nothing that has left the tree", () => {
    expect(() => Object.keys(ALLOWED).forEach((path) => statSync(path))).not.toThrow();
  });

  it("says why every allowed file is allowed", () => {
    expect(Object.values(ALLOWED).filter((reason) => reason.length < 40)).toEqual([]);
  });
});
