import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { pgAdapterOptions } from "../src/lib/db-url";
import { generateVerifyToken } from "../src/lib/verifyToken";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");

const host = new URL(dbUrl).hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
  throw new Error(`Refusing to run: DATABASE_URL points at "${host}", not a local database`);
}

const adapter = new PrismaPg(pgAdapterOptions(dbUrl));
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const AGE_GROUPS = [
  "البدريين",
  "الفائزين",
  "النجميين",
  "المجاهدين",
  "المنصورين",
  "الخاشعين",
  "التائبين",
];

const FIRST_NAMES = [
  "محمد",
  "أحمد",
  "سيدي",
  "الحسن",
  "عبد الله",
  "إبراهيم",
  "يعقوب",
  "المختار",
  "بابا",
  "الشيخ",
  "عثمان",
  "موسى",
  "خالد",
  "سليمان",
  "يوسف",
  "عمر",
];

const LAST_NAMES = [
  "ولد أحمد",
  "ولد محمد",
  "ولد سيدي",
  "ولد الحسن",
  "ولد بابا",
  "ولد المختار",
  "ولد إبراهيم",
  "ولد عثمان",
];

const PAYMENT_METHODS = ["بنكيلي", "السداد", "مصرفي", "نقداً"];
const REJECTION_REASONS = [
  "الصورة غير واضحة",
  "المبلغ المدفوع غير مطابق",
  "لم يتم العثور على العملية",
  "معلومات ناقصة أو غير صحيحة",
  "طلب مكرر",
];
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
const PALETTE = ["#265c49", "#357a62", "#4a9c7e", "#c47c5a", "#b0643e", "#70b89c"];
const written: string[] = [];

function placeholder(name: string): string {
  written.push(name);
  return name;
}

async function writePlaceholders() {
  await mkdir(UPLOAD_DIR, { recursive: true });
  for (let i = 0; i < written.length; i++) {
    const name = written[i];
    const colour = PALETTE[i % PALETTE.length];
    const label = name.replace(/^seed-|\.webp$/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="600" height="600" fill="${colour}"/>
      <text x="300" y="320" font-size="56" fill="#ffffff" text-anchor="middle"
        font-family="sans-serif">${label}</text>
    </svg>`;
    const base = Buffer.from(svg);
    await writeFile(join(UPLOAD_DIR, name), await sharp(base).webp({ quality: 75 }).toBuffer());
    await writeFile(
      join(UPLOAD_DIR, name.replace(/\.webp$/, "-thumb.webp")),
      await sharp(base).resize(300, 300, { fit: "cover" }).webp({ quality: 70 }).toBuffer(),
    );
  }
  console.log(`Placeholder images written: ${written.length * 2} files in ${UPLOAD_DIR}`);
}

let seq = 0;
function next(): number {
  seq += 1;
  return seq;
}

function pick<T>(list: T[], i: number): T {
  return list[i % list.length];
}

function fullName(i: number): string {
  return `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, Math.floor(i / 3))}`;
}

function phone(i: number): string {
  const prefix = ["2", "3", "4"][i % 3];
  return prefix + String(1000000 + i * 7919).slice(0, 7);
}

function referenceCode(i: number): string {
  let code = "";
  let n = i * 104729 + 7;
  for (let k = 0; k < 5; k++) {
    code += REFERENCE_ALPHABET[n % REFERENCE_ALPHABET.length];
    n = Math.floor(n / REFERENCE_ALPHABET.length) + 31 * (k + 1);
  }
  return `AJ-${code}`;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function wipe() {
  await prisma.mvpVote.deleteMany();
  await prisma.mvpCandidate.deleteMany();
  await prisma.matchMvpVote.deleteMany();
  await prisma.matchGoal.deleteMany();
  await prisma.matchBooking.deleteMany();
  await prisma.match.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.teamFollow.deleteMany();
  await prisma.team.deleteMany();
  await prisma.group.deleteMany();
  await prisma.activityRegistration.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.quizAssignment.deleteMany();
  await prisma.quizAnswer.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quizSettings.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.siteVisit.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.member.deleteMany();
  await prisma.user.deleteMany();
  await prisma.counter.deleteMany();
}

async function main() {
  await wipe();

  const adminPassword = await bcrypt.hash("admin123", 12);
  const userPassword = await bcrypt.hash("user123", 12);

  for (const [username, role] of [
    ["admin", "SUPER"],
    ["members", "MEMBERS"],
    ["activities", "ACTIVITIES"],
  ]) {
    await prisma.admin.upsert({
      where: { username },
      update: { password: adminPassword, role },
      create: { username, password: adminPassword, role },
    });
  }

  for (const name of AGE_GROUPS) {
    await prisma.ageGroup.upsert({ where: { name }, update: {}, create: { name } });
  }

  const users = [];
  for (let i = 0; i < 34; i++) {
    users.push(
      await prisma.user.create({
        data: {
          phone: phone(i),
          password: userPassword,
          currentStreak: i % 5,
          longestStreak: (i % 5) + (i % 3),
          lastActiveDate: i % 4 === 0 ? daysAgo(i % 7) : null,
          createdAt: daysAgo(120 - i * 3),
        },
      }),
    );
  }

  const active = [];
  const pending = [];
  let memberNumber = 0;

  for (let i = 0; i < 34; i++) {
    const status = i < 22 ? "ACTIVE" : i < 30 ? "PENDING" : "REJECTED";
    // One account, one membership: the unique index on Member.userId means a
    // seed that doubled up would not load at all. Every ninth member is left
    // unattached, which is the admin-added case, so those accounts model the
    // other real state: an account with no request behind it.
    const user = users[i];
    const isActive = status === "ACTIVE";
    if (isActive) memberNumber += 1;

    const member = await prisma.member.create({
      data: {
        userId: i % 9 === 8 ? null : user.id,
        fullName: fullName(i),
        age: pick(AGE_GROUPS, i),
        paymentMethod: pick(PAYMENT_METHODS, i),
        paymentProof: i % 7 === 6 ? null : placeholder(`seed-proof-${next()}.webp`),
        photo: i % 3 === 0 ? placeholder(`seed-photo-${next()}.webp`) : null,
        paidAmount: [500, 1000, 1500, 2000, 3000][i % 5],
        referenceCode: referenceCode(i),
        status,
        rejectionReason: status === "REJECTED" ? pick(REJECTION_REASONS, i) : null,
        memberNumber: isActive ? `AJVT-2026-${String(memberNumber).padStart(4, "0")}` : null,
        verifyToken: isActive ? generateVerifyToken() : null,
        createdAt: daysAgo(100 - i * 2),
      },
    });

    if (isActive) active.push(member);
    if (status === "PENDING") pending.push(member);
  }

  await prisma.counter.upsert({
    where: { id: "memberNumber" },
    update: { value: memberNumber },
    create: { id: "memberNumber", value: memberNumber },
  });

  const tournament = await prisma.activity.create({
    data: {
      title: "دوري رابطة شباب التاكلالت 2026",
      description: "دوري كرة القدم السنوي بين فرق القرية، بمشاركة ثمانية فرق موزعة على مجموعتين.",
      period: "أغسطس 2026",
      photo: placeholder("seed-activity-1.webp"),
      isTournament: true,
      isOpen: true,
      order: 0,
    },
  });

  await prisma.activity.create({
    data: {
      title: "حملة تنظيف القرية",
      description: "حملة تطوعية لتنظيف الساحة الرئيسية ومحيط المسجد.",
      period: "سبتمبر 2026",
      isVolunteer: true,
      whatsappLink: "https://chat.whatsapp.com/seed-example",
      order: 1,
    },
  });

  const lecture = await prisma.activity.create({
    data: {
      title: "أمسية ثقافية",
      description: "أمسية شعرية ومحاضرة حول تاريخ القرية، مفتوحة لجميع الأعضاء.",
      period: "أكتوبر 2026",
      capacity: 40,
      isOpen: true,
      order: 2,
    },
  });

  for (let i = 0; i < 12; i++) {
    await prisma.activityRegistration.create({
      data: {
        memberId: active[i].id,
        activityId: lecture.id,
        status: i < 8 ? "ACTIVE" : i < 11 ? "PENDING" : "REJECTED",
        paymentProof: i % 4 === 0 ? placeholder(`seed-reg-${next()}.webp`) : null,
        rejectionReason: i === 11 ? "معلومات ناقصة أو غير صحيحة" : null,
      },
    });
  }

  const groups = [];
  for (const name of ["المجموعة الأولى", "المجموعة الثانية"]) {
    groups.push(
      await prisma.group.create({
        data: { activityId: tournament.id, name, capacity: 4 },
      }),
    );
  }

  const teamNames = [
    "فريق النجم",
    "فريق الوحدة",
    "فريق الشباب",
    "فريق الأمل",
    "فريق النصر",
    "فريق الفتح",
    "فريق التقدم",
    "فريق الوفاق",
  ];

  const teams = [];
  for (let i = 0; i < teamNames.length; i++) {
    teams.push(
      await prisma.team.create({
        data: {
          activityId: tournament.id,
          groupId: groups[i < 4 ? 0 : 1].id,
          name: teamNames[i],
          logo: i % 2 === 0 ? placeholder(`seed-logo-${next()}.webp`) : null,
        },
      }),
    );
  }

  const roster: Record<string, string[]> = {};
  for (let i = 0; i < active.length; i++) {
    const team = teams[i % teams.length];
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        memberId: active[i].id,
        status: i % 11 === 10 ? "PENDING" : "ACTIVE",
      },
    });
    roster[team.id] = roster[team.id] || [];
    roster[team.id].push(active[i].id);
  }

  for (let i = 0; i < users.length; i++) {
    await prisma.teamFollow.create({
      data: { userId: users[i].id, teamId: teams[i % teams.length].id },
    });
  }

  const pairs = [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3],
    [4, 5],
    [6, 7],
    [4, 6],
    [5, 7],
  ];

  for (let i = 0; i < pairs.length; i++) {
    const [h, a] = pairs[i];
    const played = i < 6;
    const homeScore = played ? (i * 3) % 4 : null;
    const awayScore = played ? (i * 5) % 3 : null;

    const match = await prisma.match.create({
      data: {
        activityId: tournament.id,
        homeTeamId: teams[h].id,
        awayTeamId: teams[a].id,
        matchDate: played ? daysAgo(20 - i * 2) : daysAgo(-3 - i),
        round: "دور المجموعات",
        venue: "ملعب القرية",
        order: i,
        homeScore,
        awayScore,
        status: played ? "PLAYED" : "SCHEDULED",
        manOfTheMatchId: played ? (roster[teams[h].id]?.[0] ?? null) : null,
      },
    });

    if (!played) continue;

    for (let g = 0; g < (homeScore ?? 0); g++) {
      const scorers = roster[teams[h].id];
      if (!scorers?.length) break;
      await prisma.matchGoal.create({
        data: {
          matchId: match.id,
          memberId: pick(scorers, g),
          teamId: teams[h].id,
          minute: 10 + g * 17,
        },
      });
    }

    const bookable = roster[teams[a].id];
    if (i % 2 === 0 && bookable?.length) {
      await prisma.matchBooking.create({
        data: {
          matchId: match.id,
          memberId: bookable[0],
          teamId: teams[a].id,
          cardType: i % 4 === 0 ? "YELLOW" : "RED",
          minute: 55 + i,
        },
      });
    }

    if (i === 0) {
      const vote = await prisma.matchMvpVote.create({
        data: { matchId: match.id, status: "OPEN" },
      });
      const candidates = [];
      for (const memberId of (roster[teams[h].id] ?? []).slice(0, 3)) {
        candidates.push(await prisma.mvpCandidate.create({ data: { voteId: vote.id, memberId } }));
      }
      for (let v = 0; v < Math.min(users.length, 6); v++) {
        if (!candidates.length) break;
        await prisma.mvpVote.create({
          data: {
            voteId: vote.id,
            candidateId: pick(candidates, v).id,
            userId: users[v].id,
          },
        });
      }
    }
  }

  for (let i = 0; i < active.length; i++) {
    const m = active[i];
    await prisma.donation.create({
      data: {
        donorName: m.fullName,
        amount: m.paidAmount,
        status: "ACTIVE",
        source: "MEMBERSHIP",
        paymentMethod: m.paymentMethod,
        memberId: m.id,
        createdAt: m.createdAt,
      },
    });
  }

  for (let i = 0; i < 10; i++) {
    const anonymous = i % 3 === 0;
    await prisma.donation.create({
      data: {
        donorName: anonymous ? null : fullName(40 + i),
        donorPhone: anonymous ? null : phone(40 + i),
        donorPhoto: i % 5 === 0 ? placeholder(`seed-donor-${next()}.webp`) : null,
        amount: [2000, 5000, 10000, 15000, 25000][i % 5],
        proof: placeholder(`seed-donation-${next()}.webp`),
        status: i < 7 ? "ACTIVE" : "PENDING",
        source: "PUBLIC",
        paymentMethod: pick(PAYMENT_METHODS, i),
        createdAt: daysAgo(60 - i * 4),
      },
    });
  }

  // Two kinds of anonymous giver, because the leaderboard treats them
  // differently: a walk-in with nothing to group on is one row per gift, while
  // a member who asked not to be named is one row for the account, however
  // many times they gave.
  for (let i = 0; i < 4; i++) {
    await prisma.donation.create({
      data: {
        donorName: null,
        amount: [3000, 7500, 12000, 20000][i],
        proof: placeholder(`seed-donation-${next()}.webp`),
        status: "ACTIVE",
        source: "PUBLIC",
        paymentMethod: pick(PAYMENT_METHODS, i),
        createdAt: daysAgo(50 - i * 3),
      },
    });
  }

  const shyGivers = active.slice(0, 2);
  for (let i = 0; i < shyGivers.length; i++) {
    for (const amount of [4000, 6000]) {
      await prisma.donation.create({
        data: {
          donorName: null,
          amount,
          proof: placeholder(`seed-donation-${next()}.webp`),
          status: "ACTIVE",
          source: "SELF",
          paymentMethod: pick(PAYMENT_METHODS, i),
          memberId: shyGivers[i].id,
          createdAt: daysAgo(30 - i * 2),
        },
      });
    }
  }

  const expenses = [
    ["كرات وتجهيزات رياضية", 18000],
    ["أدوات النظافة للحملة التطوعية", 7500],
    ["طباعة بطاقات العضوية", 4200],
    ["إيجار الملعب", 12000],
    ["ضيافة الأمسية الثقافية", 6300],
    ["جوائز الدوري", 30000],
  ];

  for (let i = 0; i < expenses.length; i++) {
    const [label, amount] = expenses[i];
    await prisma.expense.create({
      data: {
        label: label as string,
        amount: amount as number,
        note: i % 2 === 0 ? "فاتورة متوفرة لدى أمين الصندوق" : null,
        proof: i % 3 === 0 ? placeholder(`seed-expense-${next()}.webp`) : null,
        date: daysAgo(45 - i * 6),
        createdBy: "admin",
      },
    });
  }

  for (let d = 0; d < 30; d++) {
    const date = daysAgo(d).toISOString().slice(0, 10);
    for (let v = 0; v < 3 + (d % 7); v++) {
      await prisma.siteVisit.create({
        data: {
          date,
          visitorId: `seed-visitor-${d}-${v}`,
          pageViews: 1 + ((d + v) % 5),
        },
      });
    }
  }

  await prisma.quizSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const questions = [
    ["في أي سنة تأسست رابطة شباب قرية التاكلالت؟", "تاريخ", ["2015", "2018", "2020", "2022"], 1],
    ["كم عدد اللاعبين في فريق كرة القدم داخل الملعب؟", "رياضة", ["9", "10", "11", "12"], 2],
    ["ما هي عاصمة موريتانيا؟", "جغرافيا", ["نواذيبو", "نواكشوط", "روصو", "كيفة"], 1],
    ["كم عدد أركان الإسلام؟", "ثقافة عامة", ["أربعة", "خمسة", "ستة", "سبعة"], 1],
  ];

  const created = [];
  for (const [text, category, answers, correctIndex] of questions) {
    const question = await prisma.quizQuestion.create({
      data: {
        text: text as string,
        category: category as string,
        points: 10,
        correctCount: 1,
        createdBy: "admin",
      },
    });
    const list = answers as string[];
    for (let i = 0; i < list.length; i++) {
      await prisma.quizAnswer.create({
        data: {
          questionId: question.id,
          text: list[i],
          isCorrect: i === (correctIndex as number),
          order: i,
        },
      });
    }
    created.push(question);
  }

  for (let i = 0; i < users.length; i++) {
    const question = created[i % created.length];
    const answered = i % 3 !== 2;
    await prisma.quizAssignment.create({
      data: {
        userId: users[i].id,
        questionId: question.id,
        batchId: "seed-batch-1",
        mode: "RANDOM",
        sentAt: daysAgo(5),
        answeredAt: answered ? daysAgo(4) : null,
        isCorrect: answered ? i % 2 === 0 : null,
        pointsAwarded: answered && i % 2 === 0 ? 10 : 0,
      },
    });
  }

  for (let i = 0; i < 8; i++) {
    await prisma.auditLog.create({
      data: {
        adminUsername: "admin",
        action: pick(["VALIDATE_MEMBER", "REJECT_MEMBER", "CREATE_EXPENSE", "UPDATE_MATCH"], i),
        targetLabel: fullName(i),
        createdAt: daysAgo(10 - i),
      },
    });
  }

  const counts = {
    users: users.length,
    members: 34,
    activities: 3,
    teams: teams.length,
    matches: pairs.length,
    donations: active.length + 10 + 4 + shyGivers.length * 2,
    expenses: expenses.length,
    questions: created.length,
  };

  await writePlaceholders();

  console.log("Dev data seeded:", counts);
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
