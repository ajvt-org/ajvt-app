import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const FUTURE_SLACK_DAYS = 1;

const HAND_DATED_BEFORE_THE_GUARD = new Set([
  "20260821090000_quiz_category_rounds",
  "20260822090000_drop_quiz_assignments",
  "20260823090000_question_banks",
  "20260823100000_competition_bank",
  "20260824090000_score_curve",
  "20260825090000_quiz_boards",
  "20260826090000_payment_donor_photo",
  "20260826100000_payment_donor_phone_tags",
  "20260826110000_payment_recorded_by",
  "20260827090000_competition_drop_pool_size",
  "20260828090000_quiz_board_block_title",
  "20260829090000_quiz_confirm_toggle",
]);

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

  it("refuses a new migration dated ahead of the clock", () => {
    const horizon = Date.now() + FUTURE_SLACK_DAYS * 24 * 60 * 60 * 1000;
    for (const folder of migrationFolders()) {
      if (HAND_DATED_BEFORE_THE_GUARD.has(folder)) continue;
      expect(
        timestampOf(folder).getTime(),
        `${folder} is dated more than ${FUTURE_SLACK_DAYS} day(s) in the future`,
      ).toBeLessThanOrEqual(horizon);
    }
  });

  it("holds no folder in the grandfathered list that has left the tree", () => {
    const present = new Set(migrationFolders());
    for (const folder of HAND_DATED_BEFORE_THE_GUARD) {
      expect(present.has(folder), `${folder} is listed as grandfathered but no longer exists`).toBe(
        true,
      );
    }
  });

  it("gives every migration a parseable timestamp prefix", () => {
    for (const folder of migrationFolders()) {
      expect(Number.isNaN(timestampOf(folder).getTime()), folder).toBe(false);
    }
  });
});
