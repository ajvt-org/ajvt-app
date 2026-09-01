import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/people/import/route";
import { prisma } from "@/lib/prisma";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { memberImportRun } from "@/lib/messages";
import type { ImportedRow } from "@/lib/memberImportRun";
import { resetDb, post, createAdmin, signInAsAdmin } from "./helpers";

const AGE = "البدريين";

interface RunBody {
  batchId: string;
  results: ImportedRow[];
  summary: { created: number; updated: number; failed: number; memberships: number };
  error?: string;
}

function values(over: Record<string, unknown> = {}) {
  return {
    fullName: "محمد ولد أحمد",
    phone: "",
    village: HOME_VILLAGE,
    age: AGE,
    paid: false,
    paymentMethod: "",
    paidAmount: "",
    ...over,
  };
}

function paid(over: Record<string, unknown> = {}) {
  return values({ paid: true, paymentMethod: "نقداً", ...over });
}

type RowValuesFixture = ReturnType<typeof values>;
type RunRow = RowValuesFixture | { values: RowValuesFixture; personId: string | null };

function run(rows: RunRow[], over: Record<string, unknown> = {}) {
  return POST(
    post("/api/admin/people/import", {
      batchId: "batch-1",
      fileHash: "hash",
      fileName: "members.csv",
      rows: rows.map((row, at) =>
        "values" in row
          ? { row: at + 1, personId: row.personId, values: row.values }
          : { row: at + 1, personId: null, values: row },
      ),
      ...over,
    }),
  );
}

async function asMembersAdmin() {
  await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
}

async function counterValue(id: string): Promise<number> {
  return (await prisma.counter.findUnique({ where: { id } }))?.value ?? 0;
}

describe("POST /api/admin/people/import", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.ageGroup.create({ data: { name: AGE, approved: true } });
    await asMembersAdmin();
  });

  it("refuses an anonymous caller", async () => {
    await resetDb();
    expect((await run([values()])).status).toBe(401);
  });

  it("refuses an admin scoped to another section", async () => {
    await signInAsAdmin(await createAdmin("activities-admin", "ACTIVITIES"));
    expect((await run([values()])).status).toBe(403);
  });

  it("refuses a run with no rows", async () => {
    const response = await run([]);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(memberImportRun.nothingToImport);
  });

  it("creates every row of a clean file", async () => {
    const response = await run([
      values({ fullName: "أحمد", phone: "36000123" }),
      values({ fullName: "محمد", phone: "36000124" }),
      values({ fullName: "علي", village: OTHER_VILLAGE, age: "" }),
    ]);
    const data: RunBody = await response.json();

    expect(response.status).toBe(201);
    expect(data.summary).toEqual({ created: 3, updated: 0, failed: 0, memberships: 0 });
    expect(await prisma.user.count()).toBe(3);
    expect((await prisma.user.findFirstOrThrow({ where: { fullName: "علي" } })).age).toBeNull();
  });

  it("gives a temporary password to a row with a phone and none to a row without", async () => {
    const data: RunBody = await (
      await run([values({ fullName: "أحمد", phone: "36000123" }), values({ fullName: "محمد" })])
    ).json();

    expect(data.results[0].tempPassword).toMatch(/^\d{6}$/);
    expect(data.results[1].tempPassword).toBeUndefined();

    const withoutPhone = await prisma.user.findFirstOrThrow({ where: { fullName: "محمد" } });
    expect(withoutPhone.password).toBeNull();
  });

  it("issues a membership, a number and a receipt for a paid row", async () => {
    const data: RunBody = await (await run([paid({ phone: "36000123" })])).json();

    const person = await prisma.user.findUniqueOrThrow({
      where: { id: data.results[0].personId },
    });
    expect(person.memberNumber).toMatch(/^AJVT-\d{4}-\d{4}$/);
    expect(await prisma.membership.count({ where: { status: "ACTIVE" } })).toBe(1);
    expect(await prisma.receipt.count()).toBe(1);
  });

  it("records a surplus above the fee under the person's name", async () => {
    await run([paid({ phone: "36000123", paidAmount: "500" })]);

    const payment = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(payment.amount).toBe(500);
    expect(payment.anonymous).toBe(false);
    expect(payment.donorName).toBe("محمد ولد أحمد");
  });

  it("stores the fee when a paid row names no amount", async () => {
    await run([paid({ phone: "36000123" })]);

    const payment = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(payment.amount).toBe(100);
  });

  it("creates no membership for a row that is not paid", async () => {
    await run([values({ phone: "36000123" })]);

    expect(await prisma.membership.count()).toBe(0);
    expect(await prisma.user.findFirstOrThrow({})).toMatchObject({ memberNumber: null });
  });

  it("carries on past a duplicate phone inside the same file and keeps the earlier rows", async () => {
    const data: RunBody = await (
      await run([
        values({ fullName: "أحمد", phone: "36000123" }),
        values({ fullName: "محمد", phone: "36000123" }),
        values({ fullName: "علي", phone: "36000124" }),
      ])
    ).json();

    expect(data.results.map((r) => r.outcome)).toEqual(["created", "failed", "created"]);
    expect(await prisma.user.count()).toBe(2);
  });

  it("updates an account the row collides with rather than creating a second one", async () => {
    const existing = await prisma.user.create({
      data: { phone: "36000123", fullName: "الاسم القديم", village: HOME_VILLAGE, age: AGE },
    });

    const data: RunBody = await (
      await run([
        { values: values({ fullName: "الاسم الجديد", phone: "36000123" }), personId: existing.id },
      ])
    ).json();

    expect(data.results[0].outcome).toBe("updated");
    expect(await prisma.user.count()).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: existing.id } })).fullName).toBe(
      "الاسم الجديد",
    );
  });

  it("leaves a membership the matched account already has alone", async () => {
    const existing = await prisma.user.create({
      data: { phone: "36000123", fullName: "موجود", village: HOME_VILLAGE, age: AGE },
    });
    const { membershipYear } = { membershipYear: new Date().getFullYear() };
    await prisma.membership.create({
      data: { userId: existing.id, year: membershipYear, status: "ACTIVE" },
    });

    await run([{ values: paid({ phone: "36000123" }), personId: existing.id }]);

    expect(await prisma.membership.count()).toBe(1);
    expect(await prisma.receipt.count()).toBe(0);
  });

  it("counts the memberships it made, which a row the account already covers is not one of", async () => {
    const existing = await prisma.user.create({
      data: { phone: "36000123", fullName: "موجود", village: HOME_VILLAGE, age: AGE },
    });
    await prisma.membership.create({
      data: { userId: existing.id, year: new Date().getFullYear(), status: "ACTIVE" },
    });

    const data: RunBody = await (
      await run([
        { values: paid({ phone: "36000123" }), personId: existing.id },
        paid({ fullName: "أحمد", phone: "36000124" }),
        paid({ fullName: "علي", phone: "36000125" }),
      ])
    ).json();

    expect(data.summary).toEqual({ created: 2, updated: 1, failed: 0, memberships: 2 });
    expect(data.results.map((row) => row.membership)).toEqual([false, true, true]);
    expect(await prisma.membership.count()).toBe(3);
  });

  it("counts no membership for a file nobody paid for", async () => {
    const data: RunBody = await (
      await run([values({ phone: "36000123" }), values({ fullName: "أحمد", phone: "36000124" })])
    ).json();

    expect(data.summary.memberships).toBe(0);
    expect(data.summary.created).toBe(2);
  });

  it("logs no membership for a paid row the account already covers", async () => {
    const existing = await prisma.user.create({
      data: { phone: "36000123", fullName: "موجود", village: HOME_VILLAGE, age: AGE },
    });
    await prisma.membership.create({
      data: { userId: existing.id, year: new Date().getFullYear(), status: "ACTIVE" },
    });

    await run([{ values: paid({ phone: "36000123" }), personId: existing.id }]);

    expect(await prisma.auditLog.count({ where: { action: "UPDATE_PERSON" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "ADD_MEMBERSHIP" } })).toBe(0);
  });

  it("fails a row that is still flagged rather than writing it", async () => {
    const data: RunBody = await (
      await run([values({ age: "" }), values({ fullName: "علي", phone: "36000124" })])
    ).json();

    expect(data.results[0].outcome).toBe("failed");
    expect(data.results[1].outcome).toBe("created");
    expect(await prisma.user.count()).toBe(1);
  });

  it("burns no membership number and no receipt number on a row that fails", async () => {
    await prisma.user.create({
      data: { phone: "36000123", fullName: "موجود", village: HOME_VILLAGE, age: AGE },
    });
    const before = await counterValue("memberNumber");

    await run([values({ fullName: "لا اسم صالح".repeat(10), phone: "36000199", paid: true })]);

    expect(await counterValue("memberNumber")).toBe(before);
    expect(await prisma.receipt.count()).toBe(0);
  });

  it("refuses to run the same batch a second time", async () => {
    const rows = [values({ phone: "36000123" })];

    expect((await run(rows)).status).toBe(201);
    const replay = await run(rows);

    expect(replay.status).toBe(409);
    expect((await replay.json()).error).toBe(memberImportRun.batchAlreadyRan);
    expect(await prisma.user.count()).toBe(1);
  });

  it("does not double the accounts when the same file is uploaded again under a new batch", async () => {
    const row = values({ fullName: "أحمد", phone: "36000123" });

    await run([row]);
    const account = await prisma.user.findFirstOrThrow({ where: { phone: "36000123" } });
    const second: RunBody = await (
      await run([{ values: row, personId: account.id }], { batchId: "batch-2" })
    ).json();

    expect(second.results[0].outcome).toBe("updated");
    expect(await prisma.user.count()).toBe(1);
  });

  it("refuses a row that names no account when the phone now belongs to one", async () => {
    await prisma.user.create({
      data: { phone: "36000123", fullName: "موجود", village: HOME_VILLAGE, age: AGE },
    });

    const data: RunBody = await (await run([values({ phone: "36000123" })])).json();

    expect(data.results[0].outcome).toBe("failed");
    expect(data.results[0].error).toBe(memberImportRun.matchChanged);
    expect(await prisma.user.count()).toBe(1);
  });

  it("refuses a row naming an account the file no longer matches", async () => {
    const other = await prisma.user.create({
      data: { phone: "36000900", fullName: "آخر", village: HOME_VILLAGE, age: AGE },
    });

    const data: RunBody = await (
      await run([{ values: values({ phone: "36000123" }), personId: other.id }])
    ).json();

    expect(data.results[0].outcome).toBe("failed");
    expect(data.results[0].error).toBe(memberImportRun.matchChanged);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: other.id } })).fullName).toBe("آخر");
  });

  it("writes one audit entry for the import beside the per person entries", async () => {
    await run([paid({ phone: "36000123" })]);

    const forImport = await prisma.auditLog.findMany({ where: { action: "IMPORT_PEOPLE" } });
    expect(forImport).toHaveLength(1);
    expect(forImport[0].after).toMatchObject({ created: 1, failed: 0 });
    expect(await prisma.auditLog.count({ where: { action: "CREATE_PERSON" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "ADD_MEMBERSHIP" } })).toBe(1);
  });
});
