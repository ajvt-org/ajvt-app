import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/export/[dataset]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";

function download(dataset: string) {
  return GET(get(`/api/admin/export/${dataset}`), {
    params: Promise.resolve({ dataset }),
  });
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
    await prisma.donation.create({
      data: {
        donorName: "أحمد",
        amount: 500,
        status: "ACTIVE",
        tags: { connect: { id: tag.id } },
      },
    });

    const body = await (await download("donations")).text();

    expect(body).toContain("أحمد");
    expect(body).toContain("القافلة الصحية");
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
