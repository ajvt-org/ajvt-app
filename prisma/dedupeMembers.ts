import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { findDuplicateAccounts, applyDuplicatePlans } from "../src/lib/duplicateMembersServer";
import type { DuplicateRow } from "../src/lib/duplicateMembersServer";

// Reports, and with --apply settles, the accounts that hold more than one
// membership. Prints what it would do and changes nothing unless asked, so the
// list can be read before anything goes.
//
// No account is ever deleted. The same rule runs in the migration that adds
// the unique index, so an account settled here is a no-op there.

// The name first: two people sharing a phone read as a duplicate until you
// see that the names differ, and that is the case worth stopping on.
function describe(row: DuplicateRow): string {
  const records = [
    row.memberNumber ? `card ${row.memberNumber}` : null,
    row.registrations ? `${row.registrations} registrations` : null,
    row.teamMemberships ? `${row.teamMemberships} teams` : null,
    row.donations ? `${row.donations} donations` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return `${row.fullName} — ${row.status} ${row.createdAt.toISOString().slice(0, 10)}${
    records ? ` (${records})` : ""
  } [${row.id}]`;
}

async function overview() {
  const [accounts, memberships, unattached] = await Promise.all([
    prisma.user.count(),
    prisma.member.count(),
    prisma.member.count({ where: { userId: null } }),
  ]);
  console.log(
    `${accounts} accounts, ${memberships} memberships, ${unattached} of them with no account`,
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  await overview();
  const plans = await findDuplicateAccounts();

  if (plans.length === 0) {
    console.log("no account holds more than one membership");
    return;
  }

  console.log(`\n${plans.length} accounts hold more than one membership`);
  for (const plan of plans) {
    const account = await prisma.user.findUnique({
      where: { id: plan.keep.userId },
      select: { phone: true },
    });
    console.log(`\naccount ${account?.phone ?? plan.keep.userId}`);
    console.log(`  keep    ${describe(plan.keep)}`);
    for (const row of plan.remove) console.log(`  delete  ${describe(row)}`);
    for (const row of plan.detach) console.log(`  detach  ${describe(row)}`);
  }

  const remove = plans.flatMap((p) => p.remove).length;
  const detach = plans.flatMap((p) => p.detach).length;
  console.log(`\n${remove} memberships to delete, ${detach} to detach, 0 accounts touched`);

  if (!apply) {
    console.log("dry run — pass --apply to carry it out");
    return;
  }

  const done = await applyDuplicatePlans(plans);
  console.log(`deleted ${done.removed}, detached ${done.detached}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
