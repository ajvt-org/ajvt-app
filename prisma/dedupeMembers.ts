import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { planAccount, type DuplicateMember } from "../src/lib/duplicateMembers";

// Reports, and with --apply settles, the accounts that hold more than one
// membership. Prints what it would do and changes nothing unless asked, so the
// list can be read before anything goes.
//
// The same rule runs in the migration that adds the unique index, so an
// account settled here is a no-op there.

type Row = DuplicateMember & { userId: string; fullName: string };

async function load(): Promise<Map<string, Row[]>> {
  const members = await prisma.member.findMany({
    where: { userId: { not: null } },
    select: {
      id: true,
      userId: true,
      fullName: true,
      status: true,
      createdAt: true,
      memberNumber: true,
      _count: {
        select: {
          registrations: true,
          teamMemberships: true,
          donations: true,
          matchGoals: true,
          matchBookings: true,
          mvpCandidacies: true,
          motmMatches: true,
        },
      },
    },
  });

  const byUser = new Map<string, Row[]>();
  for (const m of members) {
    const row: Row = {
      id: m.id,
      userId: m.userId!,
      fullName: m.fullName,
      status: m.status,
      createdAt: m.createdAt,
      memberNumber: m.memberNumber,
      ...m._count,
    };
    const rows = byUser.get(row.userId);
    if (rows) rows.push(row);
    else byUser.set(row.userId, [row]);
  }
  return byUser;
}

function describe(row: Row): string {
  const records = [
    row.memberNumber ? `carte ${row.memberNumber}` : null,
    row.registrations ? `${row.registrations} inscriptions` : null,
    row.teamMemberships ? `${row.teamMemberships} équipes` : null,
    row.donations ? `${row.donations} dons` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return `${row.id} ${row.status} ${row.createdAt.toISOString().slice(0, 10)}${
    records ? ` (${records})` : ""
  }`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const byUser = await load();

  const plans = [...byUser.values()].map(planAccount).filter((p) => p !== null);
  if (plans.length === 0) {
    console.log("no account holds more than one membership");
    return;
  }

  console.log(`${plans.length} accounts hold more than one membership`);
  for (const plan of plans) {
    console.log(`\naccount ${plan.keep.userId}`);
    console.log(`  keep    ${describe(plan.keep)}`);
    for (const row of plan.remove) console.log(`  delete  ${describe(row)}`);
    for (const row of plan.detach) console.log(`  detach  ${describe(row)}`);
  }

  const remove = plans.flatMap((p) => p.remove).map((m) => m.id);
  const detach = plans.flatMap((p) => p.detach).map((m) => m.id);
  console.log(`\n${remove.length} to delete, ${detach.length} to detach`);

  if (!apply) {
    console.log("dry run — pass --apply to carry it out");
    return;
  }

  await prisma.$transaction([
    prisma.member.updateMany({ where: { id: { in: detach } }, data: { userId: null } }),
    prisma.member.deleteMany({ where: { id: { in: remove } } }),
  ]);
  console.log("done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
