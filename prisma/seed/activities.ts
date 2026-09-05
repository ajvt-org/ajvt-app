import { prisma } from "./client";
import { placeholder } from "./images";
import { next } from "./random";
import type { SeededMember } from "./members";

export type SeededActivity = Awaited<ReturnType<typeof prisma.activity.create>>;

export interface SeededActivities {
  league: SeededActivity;
  cup: SeededActivity;
  doubles: SeededActivity;
  chess: SeededActivity;
  dhamet: SeededActivity;
  volunteer: SeededActivity;
  lecture: SeededActivity;
  health: SeededActivity;
}

export async function seedActivities(): Promise<SeededActivities> {
  const league = await prisma.activity.create({
    data: {
      title: "دوري رابطة شباب التاكلالت 2026",
      description: "دوري كرة القدم السنوي بين فرق القرية، بمشاركة ثمانية فرق موزعة على مجموعتين.",
      period: "أغسطس 2026",
      startsAt: new Date(Date.now() - 22 * 86_400_000),
      endsAt: new Date(),
      photo: placeholder("seed-activity-1.webp"),
      isTournament: true,
      format: "GROUPS_THEN_KNOCKOUT",
      isOpen: true,
      order: 0,
    },
  });

  const doubles = await prisma.activity.create({
    data: {
      title: "بطولة مارياس للأزواج",
      description: "بطولة خروج المغلوب بين أزواج من لاعبين اثنين.",
      period: "سبتمبر 2026",
      isTournament: true,
      format: "KNOCKOUT",
      matchShape: "SERIES",
      minTeamSize: 2,
      maxTeamSize: 2,
      isOpen: true,
      order: 1,
    },
  });

  const chess = await prisma.activity.create({
    data: {
      title: "بطولة الشطرنج",
      description: "بطولة إقصائية فردية، لم تبدأ بعد ولا فرق مسجلة فيها.",
      period: "أكتوبر 2026",
      startsAt: new Date(Date.now() + 40 * 86_400_000),
      endsAt: new Date(Date.now() + 46 * 86_400_000),
      capacity: 32,
      isTournament: true,
      format: "KNOCKOUT",
      matchShape: "SERIES",
      isOpen: true,
      order: 2,
    },
  });

  const dhamet = await prisma.activity.create({
    data: {
      title: "بطولة الدامة",
      description: "بطولة فردية، كل مشارك يلعب لنفسه، فرقها مكتملة وجاهزة للقرعة.",
      period: "سبتمبر 2026",
      startsAt: new Date(Date.now() + 2 * 86_400_000),
      endsAt: new Date(Date.now() + 6 * 86_400_000),
      capacity: 8,
      isTournament: true,
      format: "KNOCKOUT",
      matchShape: "SERIES",
      minTeamSize: 1,
      maxTeamSize: 1,
      isOpen: true,
      order: 6,
    },
  });

  const cup = await prisma.activity.create({
    data: {
      title: "كأس التاكلالت 2025",
      description: "نسخة العام الماضي، منتهية بكل مراحلها، مجموعات ثم إقصائيات وبطل.",
      startsAt: new Date(Date.now() - 40 * 86_400_000),
      endsAt: new Date(Date.now() - 30 * 86_400_000),
      capacity: 30,
      isTournament: true,
      format: "GROUPS_THEN_KNOCKOUT",
      isOpen: false,
      order: 7,
    },
  });

  const volunteer = await prisma.activity.create({
    data: {
      title: "حملة تنظيف القرية",
      description: "حملة تطوعية لتنظيف الساحة الرئيسية ومحيط المسجد.",
      period: "سبتمبر 2026",
      isVolunteer: true,
      whatsappLink: "https://chat.whatsapp.com/seed-example",
      order: 3,
    },
  });

  const health = await prisma.activity.create({
    data: {
      title: "القافلة الصحية",
      description: "قافلة طبية تطوعية، لها إيراداتها ومصاريفها الخاصة.",
      period: "نوفمبر 2026",
      isVolunteer: true,
      whatsappLink: "https://chat.whatsapp.com/seed-health",
      order: 4,
    },
  });

  const lecture = await prisma.activity.create({
    data: {
      title: "أمسية ثقافية",
      description: "أمسية شعرية ومحاضرة حول تاريخ القرية، مفتوحة لجميع الأعضاء.",
      period: "أكتوبر 2026",
      capacity: 40,
      isOpen: false,
      order: 5,
    },
  });

  return { league, cup, doubles, chess, dhamet, volunteer, lecture, health };
}

export async function seedRegistrations(
  activities: SeededActivities,
  active: SeededMember[],
  pending: SeededMember[],
) {
  const lectureCount = Math.min(12, active.length);
  for (let i = 0; i < lectureCount; i++) {
    await prisma.activityRegistration.create({
      data: {
        userId: active[i].userId,
        activityId: activities.lecture.id,
        status: i < 8 ? "ACTIVE" : i < 11 ? "PENDING" : "REJECTED",
        paymentProof: i % 4 === 0 ? placeholder(`seed-reg-${next()}.webp`) : null,
        rejectionReason: i === 11 ? "معلومات ناقصة أو غير صحيحة" : null,
      },
    });
  }

  for (const [activity, count] of [
    [activities.volunteer, 17],
    [activities.health, 7],
    [activities.chess, 5],
  ] as const) {
    for (let i = 0; i < Math.min(count, active.length); i++) {
      await prisma.activityRegistration.create({
        data: {
          userId: active[i].userId,
          activityId: activity.id,
          status: "ACTIVE",
        },
      });
    }
  }

  for (let i = 0; i < Math.min(3, pending.length); i++) {
    await prisma.activityRegistration.create({
      data: {
        userId: pending[i].userId,
        activityId: activities.volunteer.id,
        status: "PENDING",
      },
    });
  }
}

export async function seedRosterRegistrations() {
  const rostered = await prisma.teamMember.findMany({
    select: { userId: true, team: { select: { activityId: true } } },
  });
  await prisma.activityRegistration.createMany({
    data: rostered.map((r) => ({
      userId: r.userId,
      activityId: r.team.activityId,
      status: "ACTIVE" as const,
    })),
    skipDuplicates: true,
  });
}
