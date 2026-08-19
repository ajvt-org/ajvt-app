import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/export/[dataset]/route";
import { prisma } from "@/lib/prisma";
import { mirrorDonation } from "@/lib/paymentMirror";
import { resetDb, get, createAdmin, signInAsAdmin, withParams } from "./helpers";

function download(dataset: string) {
  return GET(get(`/api/admin/export/${dataset}`), withParams({ dataset }));
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
    await prisma.member.create({
      data: {
        fullName: "محمد ولد أحمد",
        age: "البدريين",
        paymentMethod: "بنكيلي",
        status: "ACTIVE",
        paidAmount: 100,
      },
    });

    const res = await download("members");
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("members-");
    expect(body).toContain("محمد ولد أحمد");
    expect(body).toContain("مقبول");
  });

  it("carries a donation's tags into the export", async () => {
    await signInAsAdmin(await createAdmin());
    const tag = await prisma.financeTag.create({ data: { name: "القافلة الصحية" } });
    const donation = await prisma.donation.create({
      data: {
        donorName: "أحمد",
        amount: 500,
        status: "ACTIVE",
        tags: { connect: { id: tag.id } },
      },
    });
    await mirrorDonation(prisma, {
      donationId: donation.id,
      amount: 500,
      method: null,
      proof: null,
      status: "ACTIVE",
      donorName: "أحمد",
      donorPhoto: null,
      donorPhone: null,
      memberId: null,
      activityId: null,
      tagIds: [tag.id],
    });

    const body = await (await download("donations")).text();

    expect(body).toContain("أحمد");
    expect(body).toContain("القافلة الصحية");
  });

  it("splits a membership payment into the fee and the support it carried", async () => {
    await signInAsAdmin(await createAdmin());
    const m = await prisma.member.create({
      data: { fullName: "محمد", age: "البدريين", paymentMethod: "بنكيلي", status: "ACTIVE" },
    });
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.id, 1000, 100);

    const row = (await (await download("members")).text()).split("\n")[1];

    expect(row.split(",").slice(4, 7)).toEqual(['"100"', '"900"', '"1000"']);
  });

  it("carries the support half of a membership payment as a surplus gift", async () => {
    await signInAsAdmin(await createAdmin());
    const m = await prisma.member.create({
      data: { fullName: "محمد", age: "البدريين", paymentMethod: "بنكيلي", status: "ACTIVE" },
    });
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.id, 1000, 100);

    const body = await (await download("donations")).text();

    expect(body).toContain("فائض انتساب");
    expect(body).toContain("900");
    expect(body).not.toContain("1000");
  });

  it("leaves a membership payment that carried nothing off the donations export", async () => {
    await signInAsAdmin(await createAdmin());
    const m = await prisma.member.create({
      data: { fullName: "محمد", age: "البدريين", paymentMethod: "بنكيلي", status: "ACTIVE" },
    });
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.id, 100, 100);

    const body = await (await download("donations")).text();

    expect(body.trim().split("\n")).toHaveLength(1);
  });

  it("exports the age groups with their rate", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.ageGroup.create({ data: { name: "البدريين", totalCount: 10 } });
    await prisma.member.create({
      data: {
        fullName: "عضو",
        age: "البدريين",
        paymentMethod: "بنكيلي",
        status: "ACTIVE",
      },
    });

    const body = await (await download("ages")).text();

    expect(body).toContain("البدريين");
    expect(body).toContain("10%");
  });
});
