import { prisma } from "./seed/client";
import { wipe } from "./seed/wipe";
import {
  seedAdmins,
  seedAgeGroups,
  seedVillages,
  seedUsers,
  seedPushSubscriptions,
} from "./seed/accounts";
import { seedMembers } from "./seed/members";
import { seedActivities, seedRegistrations, seedRosterRegistrations } from "./seed/activities";
import { seedLeague, seedDoubles, seedFinishedCup, seedSingles } from "./seed/tournament";
import { seedTags, seedDonations, seedExpenses } from "./seed/finance";
import { seedQuizSettings, seedQuestions, seedCompetitions } from "./seed/quiz";
import { seedPlayedRounds, seedClosingSoon } from "./seed/quizPlay";
import { seedSiteVisits, seedAuditLog, seedDeletedRecords } from "./seed/history";
import { seedGroupsOfFour } from "./seed/groupsOfFour";
import { seedForfeit } from "./seed/forfeit";
import { seedOfficers, seedReceipts } from "./seed/receipts";
import { writePlaceholders } from "./seed/images";

const USERS = 246;

async function main() {
  await wipe();
  await seedAdmins();
  await seedAgeGroups();
  await seedVillages();

  const users = await seedUsers(USERS);
  const members = await seedMembers(users);

  const attached = new Set(members.all.map((m) => m.userId).filter(Boolean));
  const bare = users.filter((u) => !attached.has(u.id));
  await seedPushSubscriptions(bare.slice(0, 9).map((u) => u.id));

  const activities = await seedActivities();
  await seedRegistrations(activities, members.active, members.pending);

  await seedOfficers();

  const league = await seedLeague(activities.league, members.active, users);
  const forfeit = await seedForfeit(activities.league.id);
  const doubles = await seedDoubles(activities.doubles, members.active);
  const singles = await seedSingles(activities.dhamet, members.active);
  const cupTeams = await seedFinishedCup(activities.cup, members.active, users);
  const groupsOfFour = await seedGroupsOfFour(members.active);
  await seedRosterRegistrations();

  const tags = await seedTags();
  const donations = await seedDonations(members.active, activities.health, tags);
  const expenses = await seedExpenses(activities.health, tags);
  const receipts = await seedReceipts();

  await seedQuizSettings();
  const questions = await seedQuestions();
  const competitions = await seedCompetitions(users, questions);
  await seedPlayedRounds(users, competitions.open.id);
  await seedClosingSoon(questions);

  await seedSiteVisits(30);
  await seedAuditLog(24);
  await seedDeletedRecords();

  await writePlaceholders();

  console.log("Dev data seeded:", {
    users: users.length,
    bareAccounts: bare.length,
    members: members.all.length,
    active: members.active.length,
    pending: members.pending.length,
    activities: 9,
    teams:
      league.teams.length + doubles.length + singles.length + cupTeams.length + groupsOfFour.teams,
    matches: league.matchCount,
    forfeit: forfeit ? "1 match awarded" : "none",
    groupsOfFour: `${groupsOfFour.groups} groups, quarter final ready`,
    donations,
    expenses,
    receipts,
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
