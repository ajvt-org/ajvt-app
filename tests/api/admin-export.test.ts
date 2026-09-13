import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/export/[dataset]/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  get,
  createAdmin,
  signInAsAdmin,
  withParams,
  makeMember,
  giveGift,
} from "./helpers";

function download(dataset: string, query = "") {
  return GET(get(`/api/admin/export/${dataset}${query}`), withParams({ dataset }));
}

describe("GET /api/admin/export/[dataset]", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an admin who is not SUPER", async () => {
    await signInAsAdmin(await createAdmin("members-only", "MEMBERS"));

    expect((await download("members")).status).toBe(403);
  });

  it("refuses an unknown dataset", async () => {
    await signInAsAdmin(await createAdmin());

    expect((await download("admins")).status).toBe(404);
  });

  it("sends the members as a downloadable csv", async () => {
    await signInAsAdmin(await createAdmin());
    await makeMember({
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 100,
    });

    const res = await download("members");
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("members-");
    expect(body).toContain("محمد ولد أحمد");
    expect(body).toContain("معتمد");
  });

  it("carries a donation's tags into the export", async () => {
    await signInAsAdmin(await createAdmin());
    const tag = await prisma.financeTag.create({ data: { name: "القافلة الصحية" } });
    await giveGift({
      donorName: "أحمد",
      amount: 500,
      tags: { connect: { id: tag.id } },
    });

    const body = await (await download("donations")).text();

    expect(body).toContain("أحمد");
    expect(body).toContain("القافلة الصحية");
  });

  it("keeps a gift that arrived publicly public after a member is linked to it", async () => {
    await signInAsAdmin(await createAdmin());
    const m = await makeMember({ fullName: "محمد", age: "البدريين", status: "ACTIVE" });
    const gift = await giveGift({ donorName: "أحمد", amount: 500 });
    await prisma.payment.update({ where: { id: gift.id }, data: { userId: m.userId } });

    const body = await (await download("donations")).text();
    const row = body.split("\n").find((line) => line.includes("500")) as string;

    expect(row.split(",")[5]).toBe('"عام"');
  });

  it("splits a membership payment into the fee and the support it carried", async () => {
    await signInAsAdmin(await createAdmin());
    const m = await makeMember({
      fullName: "محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.userId, 1000, 100);

    const row = (await (await download("members")).text()).split("\n")[1];

    expect(row.split(",").slice(5, 8)).toEqual(['"100"', '"900"', '"1000"']);
  });

  it("names the membership payment a support row came from", async () => {
    await signInAsAdmin(await createAdmin());
    const m = await makeMember({
      fullName: "محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.userId, 1000, 100);

    const body = await (await download("donations")).text();

    expect(body).toContain("انتساب");
    expect(body).not.toContain("فائض");
    expect(body).toContain("900");
    expect(body).not.toContain("1000");
  });

  it("leaves a membership payment that carried nothing off the donations export", async () => {
    await signInAsAdmin(await createAdmin());
    const m = await makeMember({
      fullName: "محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.userId, 100, 100);

    const body = await (await download("donations")).text();

    expect(body.trim().split("\n")).toHaveLength(1);
  });

  it("exports the age groups with their rate", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.ageGroup.create({ data: { name: "البدريين", totalCount: 10 } });
    await makeMember({
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });

    const body = await (await download("ages")).text();

    expect(body).toContain("البدريين");
    expect(body).toContain("10%");
  });
});

describe("exporting the action log", () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function entry(over: Record<string, unknown> = {}) {
    return prisma.auditLog.create({
      data: {
        adminUsername: "boss",
        action: "UPDATE_EXPENSE",
        targetType: "Expense",
        targetLabel: "طباعة",
        ...over,
      },
    });
  }

  it("refuses an admin who is not SUPER", async () => {
    await signInAsAdmin(await createAdmin("members-only", "MEMBERS"));

    expect((await download("audit")).status).toBe(403);
  });

  it("sends the log as a downloadable csv", async () => {
    await signInAsAdmin(await createAdmin());
    await entry();

    const res = await download("audit");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("audit-log-");
  });

  it("takes only what the filters on the screen leave", async () => {
    await signInAsAdmin(await createAdmin());
    await entry({ adminUsername: "boss" });
    await entry({ adminUsername: "other" });

    const body = await (await download("audit", "?admin=other")).text();

    expect(body.trim().split("\n")).toHaveLength(2);
    expect(body).toContain("other");
    expect(body).not.toContain("boss");
  });

  it("flattens a snapshot into one readable cell", async () => {
    await signInAsAdmin(await createAdmin());
    await entry({ before: { amount: 100 }, after: { amount: 250 } });

    const body = await (await download("audit")).text();

    expect(body).toContain("المبلغ 100 ← 250");
  });

  it("holds back a confidential supporter's name the way the screen does", async () => {
    const supporter = await prisma.user.create({
      data: { phone: "22004400", password: "x", fullName: "سالم ولد أحمد" },
    });
    await prisma.user.update({
      where: { id: supporter.id },
      data: { supportNameConfidential: true },
    });
    await entry({ targetLabel: "سالم ولد أحمد", after: { donorName: "سالم ولد أحمد" } });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    const body = await (await download("audit")).text();

    expect(body).not.toContain("سالم ولد أحمد");
  });

  it("shows that name to a viewer allowed to see every supporter", async () => {
    const supporter = await prisma.user.create({
      data: { phone: "22004401", password: "x", fullName: "سالم ولد أحمد" },
    });
    await prisma.user.update({
      where: { id: supporter.id },
      data: { supportNameConfidential: true },
    });
    await entry({ targetLabel: "سالم ولد أحمد" });
    await signInAsAdmin(await createAdmin("owner", "OWNER"));

    const body = await (await download("audit")).text();

    expect(body).toContain("سالم ولد أحمد");
  });

  it("records the download in the log it just exported", async () => {
    await signInAsAdmin(await createAdmin());

    await download("audit");

    const logged = await prisma.auditLog.findFirst({ where: { action: "EXPORT_DATA" } });
    expect(logged?.targetId).toBe("audit");
  });
});
