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
  "src/app/admin/payments/useDonationActions.ts",
  "src/app/admin/payments/MemberIdentity.tsx",
  "src/app/admin/members/[id]/page.tsx",
  "src/app/admin/activities/[id]/DetailsTab.tsx",
  "src/app/admin/activities/[id]/ConvertTournamentCard.tsx",
  "src/app/admin/activities/[id]/DeleteActivityCard.tsx",
  "src/app/admin/activities/[id]/ActivityFinance.tsx",
  "src/app/admin/activities/[id]/LogTab.tsx",
  "src/app/admin/activities/[id]/page.tsx",
  "src/app/admin/activities/ActivityDatesEditor.tsx",
  "src/app/admin/activities/NewActivityDialog.tsx",
  "src/app/admin/activities/page.tsx",
  "src/app/admin/activities/[id]/activityTabs.ts",
  "src/components/admin/WorkspaceTabs.tsx",
  "src/components/admin/CountBadge.tsx",
  "src/components/admin/shell/TabStrip.tsx",
  "src/components/admin/tournament/tournamentTabs.ts",
  "src/app/admin/activities/ActivityRegistrationsPanel.tsx",
  "src/app/admin/activities/registrantFilter.ts",
  "src/app/admin/activities/registrationRecord.ts",
  "src/app/admin/activities/RegistrationRecord.tsx",
  "src/app/admin/activities/[id]/RegistrationsTab.tsx",
  "src/app/admin/activities/AddMemberToActivityForm.tsx",
  "src/app/admin/activities/activityTypes.ts",
  "src/app/admin/activities/PendingRegistrationCard.tsx",
  "src/app/admin/activities/ConfirmedRegistrantCard.tsx",
  "src/app/admin/activities/RegistrantIdentity.tsx",
  "src/app/admin/activities/PersonIdentity.tsx",
  "src/app/admin/activities/RegistrantSection.tsx",
  "src/app/api/admin/activities/[id]/detail/route.ts",
  "src/app/api/admin/activities/[id]/register",
  "src/app/api/admin/activities/[id]/days/schema.ts",
  "src/app/api/admin/activities/[id]/matches/route.ts",
  "src/app/api/admin/matches/[matchId]/mvp-vote/route.ts",
  "src/app/api/admin/activities/[id]/suspensions/schema.ts",
  "src/app/admin/receipts",
  "src/app/admin/settings",
  "src/app/api/admin/receipts",
  "src/app/api/donations/route.ts",
  "src/app/api/admin/matches/[matchId]/bookings",
  "src/app/api/admin/teams/[teamId]/members/route.ts",
  "src/app/api/teams/[teamId]/join",
  "src/app/api/admin/settings",
  "src/app/receipt",
  "src/components/receipt",
  "src/components/ActivityRegistrations.tsx",
  "src/components/admin/tournament/DaysTab.tsx",
  "src/components/admin/tournament/DayCard.tsx",
  "src/components/admin/tournament/daysTypes.ts",
  "src/components/admin/tournament/MatchCard.tsx",
  "src/components/admin/tournament/MatchCardActions.tsx",
  "src/components/admin/tournament/MatchDetailsForm.tsx",
  "src/components/admin/tournament/ResultForm.tsx",
  "src/components/admin/tournament/BracketPanel.tsx",
  "src/components/admin/tournament/BracketSuggestion.tsx",
  "src/components/admin/tournament/matchesState.ts",
  "src/components/admin/tournament/types.ts",
  "src/components/tournament/BracketTree.tsx",
  "src/components/tournament/BracketMatchCard.tsx",
  "src/components/tournament/BracketConnectors.tsx",
  "src/lib/bracketLayout.ts",
  "src/components/tournament/MatchFixture.tsx",
  "src/components/tournament/TodayBand.tsx",
  "src/components/tournament/publicTypes.ts",
  "src/lib/fixtureTeams.ts",
  "src/lib/adminMatchesServer.ts",
  "src/components/admin/tournament/TeamsTab.tsx",
  "src/components/ProofUpload.tsx",
  "src/components/admin/tournament/PlayersTab.tsx",
  "src/components/MemberCard.tsx",
  "src/components/SupportersTable.tsx",
  "src/app/(member)/leaderboard/page.tsx",
  "src/app/(member)/activities/[id]/MatchesPanel.tsx",
  "src/components/tournament/MatchResult.tsx",
  "src/components/tournament/matchCard/MatchEvents.tsx",
  "src/components/PaymentReceipts.tsx",
  "src/components/admin/shell/navTabs.ts",
  "src/lib/matchEvents.ts",
  "src/lib/memberImportColumns.ts",
  "src/lib/memberImportCheck.ts",
  "src/lib/memberImportServer.ts",
  "src/lib/memberImportRun.ts",
  "src/lib/memberImportPasswords.ts",
  "src/app/admin/dashboard/MemberImportResult.tsx",
  "src/app/admin/dashboard/MemberSearch.tsx",
  "src/app/admin/dashboard/BareAccountsSection.tsx",
  "src/lib/memberImportTemplate.ts",
  "src/app/admin/dashboard/MemberImportDialog.tsx",
  "src/app/admin/dashboard/MemberImportUpload.tsx",
  "src/app/admin/dashboard/MemberImportReview.tsx",
  "src/app/admin/dashboard/MemberImportRow.tsx",
  "src/app/admin/dashboard/MemberImportBulkFill.tsx",
  "src/app/admin/dashboard/memberImportState.ts",
  "src/app/api/admin/people/import",
  "src/lib/memberImportBulk.ts",
  "src/lib/memberImportParse.ts",
  "src/app/api/admin/validate/route.ts",
  "src/app/api/user/me/route.ts",
  "src/lib/memberImportRow.ts",
  "src/lib/memberImportValues.ts",
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
