import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const FUTURE_SLACK_DAYS = 10;

function migrationFolders(): string[] {
  return readdirSync(join(process.cwd(), "prisma", "migrations"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function timestampOf(folder: string): Date {
  const m = folder.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})_/);
  expect(m, `${folder} is not named <YYYYMMDDHHMMSS>_<name>`).not.toBeNull();
  const [, y, mo, d, h, mi, s] = m!;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

describe("migration folder order", () => {
  it("keeps every migration strictly after the one before it", () => {
    const folders = migrationFolders();
    for (let i = 1; i < folders.length; i++) {
      expect(
        folders[i] > folders[i - 1],
        `${folders[i]} does not sort after ${folders[i - 1]}`,
      ).toBe(true);
    }
  });

  it("refuses a migration dated further than the allowed slack ahead of now", () => {
    const horizon = Date.now() + FUTURE_SLACK_DAYS * 24 * 60 * 60 * 1000;
    for (const folder of migrationFolders()) {
      expect(
        timestampOf(folder).getTime(),
        `${folder} is dated more than ${FUTURE_SLACK_DAYS} days in the future`,
      ).toBeLessThanOrEqual(horizon);
    }
  });

  it("gives every migration a parseable timestamp prefix", () => {
    for (const folder of migrationFolders()) {
      expect(Number.isNaN(timestampOf(folder).getTime()), folder).toBe(false);
    }
  });
});
