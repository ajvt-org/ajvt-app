import { prisma } from "./seed/client";
import { wipe } from "./seed/wipe";
import { seedAdmins, seedAgeGroups, seedUsers } from "./seed/accounts";
import { seedMembers } from "./seed/members";
import { seedActivities, seedRegistrations } from "./seed/activities";
import { seedLeague, seedDoubles } from "./seed/tournament";
import { seedTags, seedDonations, seedExpenses } from "./seed/finance";
import { seedQuizSettings, seedQuestions, seedAssignments } from "./seed/quiz";
import { seedSiteVisits, seedAuditLog, seedDeletedRecords } from "./seed/history";
import { writePlaceholders } from "./seed/images";

const USERS = 246;

async function main() {
  await wipe();
  await seedAdmins();
  await seedAgeGroups();

  const users = await seedUsers(USERS);
  const members = await seedMembers(users);

  const activities = await seedActivities();
  await seedRegistrations(activities, members.active, members.pending);

  const league = await seedLeague(activities.league, members.active, users);
  const doubles = await seedDoubles(activities.doubles, members.active);

  const tags = await seedTags();
  const donations = await seedDonations(members.active, activities.health, tags);
  const expenses = await seedExpenses(activities.health, tags);

  await seedQuizSettings();
  const questions = await seedQuestions();
  await seedAssignments(users, questions);

  await seedSiteVisits(30);
  await seedAuditLog(24);
  await seedDeletedRecords();

  await writePlaceholders();

  console.log("Dev data seeded:", {
    users: users.length,
    members: members.all.length,
    active: members.active.length,
    pending: members.pending.length,
    activities: 6,
    teams: league.teams.length + doubles.length,
    matches: league.matchCount,
    donations,
    expenses,
    questions: questions.length,
  });
  console.log("Admins: admin / members / activities, password admin123");
  console.log(
    `Member accounts: ${users[0].phone} .. ${users[users.length - 1].phone}, password user123`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
