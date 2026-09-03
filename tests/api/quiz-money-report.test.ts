import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, createAdmin, signInAsAdmin } from "./helpers";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";

import { GET as REPORT } from "@/app/api/admin/finance/activities/route";
import { POST as RECORD_GIFT } from "@/app/api/admin/donations/route";
import { POST as RECORD_EXPENSE } from "@/app/api/admin/expenses/route";

interface ReportRow {
  key: string;
  kind: "activity" | "competition" | "general";
  title: string;
  income: number;
  spending: number;
  balance: number;
}

function activity(title = "القافلة الصحية") {
  return prisma.activity.create({ data: { title, description: "وصف" } });
}

function competition(name = "مسابقة رمضان") {
  return prisma.competition.create({
    data: {
      name,
      startsAt: new Date("2026-08-20T08:00:00.000Z"),
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 840,
      servedCount: 3,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
    },
  });
}

async function report() {
  const today = new Date().toISOString().slice(0, 10);
  const res = await REPORT(get(`/api/admin/finance/activities?from=2026-01-01&to=${today}`));
  return (await res.json()) as {
    rows: ReportRow[];
    totals: { income: number; spending: number; balance: number };
  };
}

describe("what the activity report says about a quiz", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("gives the quiz a row of its own rather than burying it in the general one", async () => {
    const quiz = await competition();
    await RECORD_GIFT(
      post("/api/admin/donations", { donorName: "أحمد", amount: 9000, competitionId: quiz.id }),
    );
    await RECORD_EXPENSE(
      post("/api/admin/expenses", { label: "جوائز", amount: 4000, competitionId: quiz.id }),
    );

    const { rows } = await report();
    const row = rows.find((r) => r.key === quiz.id);

    expect(row).toMatchObject({
      kind: "competition",
      title: "مسابقة رمضان",
      income: 9000,
      spending: 4000,
      balance: 5000,
    });
    expect(rows.some((r) => r.kind === "general")).toBe(false);
  });

  it("keeps the quiz apart from an activity and from money aimed nowhere", async () => {
    const caravan = await activity();
    const quiz = await competition();
    await RECORD_GIFT(
      post("/api/admin/donations", { donorName: "أحمد", amount: 9000, competitionId: quiz.id }),
    );
    await RECORD_GIFT(
      post("/api/admin/donations", { donorName: "سالم", amount: 3000, activityId: caravan.id }),
    );
    await RECORD_GIFT(post("/api/admin/donations", { donorName: "زائر", amount: 500 }));

    const { rows, totals } = await report();

    expect(rows.map((r) => [r.key, r.income])).toEqual([
      [quiz.id, 9000],
      [caravan.id, 3000],
      ["general", 500],
    ]);
    expect(totals.income).toBe(12500);
  });

  it("names the quiz on the receipt rather than calling it an activity", async () => {
    const quiz = await competition();
    await RECORD_GIFT(
      post("/api/admin/donations", { donorName: "أحمد", amount: 9000, competitionId: quiz.id }),
    );

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.reason).toBe("دعم مسابقة — مسابقة رمضان");
  });
});
