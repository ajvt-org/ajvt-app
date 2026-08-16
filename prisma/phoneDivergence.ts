import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// What would be lost when Member.phone goes. Nothing writes a number of its
// own any more, so from here the column only ever repeats the account's; this
// says whether it repeated it before, and which rows it did not.
//
// Read this before the migration that drops the column.

async function main() {
  const members = await prisma.member.findMany({
    select: {
      id: true,
      fullName: true,
      phone: true,
      status: true,
      user: { select: { phone: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const diverging = members.filter((m) => m.user && m.phone && m.phone !== m.user.phone);
  const orphanNumber = members.filter((m) => !m.user && m.phone);
  const noNumber = members.filter((m) => !m.user && !m.phone);

  console.log(`${members.length} members`);
  console.log(
    `  ${members.length - diverging.length - orphanNumber.length - noNumber.length} carry the same number as their account`,
  );
  console.log(`  ${diverging.length} carry a different one`);
  console.log(`  ${orphanNumber.length} have a number and no account`);
  console.log(`  ${noNumber.length} have neither`);

  for (const m of diverging) {
    console.log(`\ndiffers  ${m.id} ${m.status} ${m.fullName}`);
    console.log(`  member ${m.phone}`);
    console.log(`  account ${m.user!.phone}`);
  }
  for (const m of orphanNumber) {
    console.log(`\nno account  ${m.id} ${m.status} ${m.fullName} ${m.phone}`);
  }

  if (diverging.length || orphanNumber.length) {
    console.log("\nattach an account, or note the number elsewhere, before the column is dropped");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
