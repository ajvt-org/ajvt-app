import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ARABIC = /[؀-ۿ]/;

const KEPT_CLEAN = [
  "src/app/(member)/donate/page.tsx",
  "src/app/admin/dashboard/FilterSheet.tsx",
  "src/app/admin/dashboard/MemberDrawer.tsx",
  "src/app/admin/members/[id]/AccountPhoneForm.tsx",
  "src/app/admin/payments/DonationActions.tsx",
  "src/app/admin/payments/DonationEditForm.tsx",
  "src/app/admin/payments/LinkMemberPanel.tsx",
  "src/app/admin/payments/ManualDonationDialog.tsx",
  "src/app/admin/payments/ProofCard.tsx",
  "src/app/admin/payments/paymentTypes.ts",
  "src/app/admin/payments/donationProof.ts",
  "src/app/admin/payments/MemberIdentity.tsx",
  "src/app/admin/members/[id]/page.tsx",
  "src/app/admin/activities/[id]/DetailsTab.tsx",
  "src/app/admin/receipts",
  "src/app/admin/settings",
  "src/app/api/admin/receipts",
  "src/app/api/admin/settings",
  "src/app/receipt",
  "src/components/receipt",
  "src/components/ActivityRegistrations.tsx",
  "src/components/admin/tournament/DaysTab.tsx",
  "src/components/admin/tournament/TeamsTab.tsx",
  "src/components/ProofUpload.tsx",
  "src/components/admin/tournament/PlayersTab.tsx",
  "src/components/MemberCard.tsx",
  "src/app/(member)/activities/[id]/MatchesPanel.tsx",
  "src/components/tournament/MatchResult.tsx",
  "src/components/tournament/matchCard/MatchEvents.tsx",
  "src/components/PaymentReceipts.tsx",
  "src/components/admin/shell/navTabs.ts",
  "src/lib/matchEvents.ts",
  "src/lib/officialReceipt.ts",
  "src/lib/officialReceiptServer.ts",
  "src/lib/paymentReceiptServer.ts",
  "src/lib/receipts.ts",
  "src/lib/receiptsServer.ts",
];

function sourceFiles(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    if (!/\.tsx?$/.test(entry.name)) return [];
    if (/\.(test|ui\.test)\.tsx?$/.test(entry.name)) return [];
    return [child];
  });
}

function inlineArabic(path: string): number[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((line, index) => (ARABIC.test(line) ? index + 1 : 0))
    .filter(Boolean);
}

describe("where the Arabic lives", () => {
  it("keeps every cleaned file free of inline text, so labels stay in the texts module", () => {
    const offenders = KEPT_CLEAN.flatMap(sourceFiles)
      .map((path) => ({ path, lines: inlineArabic(path) }))
      .filter((file) => file.lines.length > 0)
      .map((file) => `${file.path}:${file.lines.join(",")}`);

    expect(offenders).toEqual([]);
  });

  it("names nothing that has left the tree", () => {
    expect(() => KEPT_CLEAN.forEach((path) => statSync(path))).not.toThrow();
  });
});
