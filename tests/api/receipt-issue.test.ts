import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, createAdmin, signInAsAdmin, withId } from "./helpers";
import { GET as LIST, POST as ISSUE } from "@/app/api/admin/receipts/route";
import { POST as VOID } from "@/app/api/admin/receipts/[id]/void/route";
import { PATCH as SAVE_SETTINGS } from "@/app/api/admin/settings/route";
import { runningYear } from "@/lib/membershipYear";

const DRAFT = {
  payerName: "السيدة فاطمة محمد عبد الله الحسن",
  reason: "دعم عام للرابطة",
  amount: 5000,
  issuedOn: new Date(2026, 7, 24).toISOString(),
};

const issue = (body: Record<string, unknown> = DRAFT) => ISSUE(post("/api/admin/receipts", body));

const voidIt = (id: string, reason: string) =>
  VOID(post(`/api/admin/receipts/${id}/void`, { reason }), withId(id));

async function asBoss() {
  await signInAsAdmin(await createAdmin("boss", "SUPER"));
}

describe("issuing a receipt", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("hands back a numbered, tokened receipt", async () => {
    await asBoss();

    const res = await issue();

    expect(res.status).toBe(201);
    const { receipt } = await res.json();
    expect(receipt.number).toBe("R-2026-0001");
    expect(receipt.token).toHaveLength(32);
    expect(receipt.payerName).toBe(DRAFT.payerName);
    expect(receipt.amount).toBe(5000);
    expect(receipt.status).toBe("ACTIVE");
  });

  it("counts up, never reusing a number", async () => {
    await asBoss();

    const first = await (await issue()).json();
    const second = await (await issue()).json();
    const third = await (await issue()).json();

    expect([first, second, third].map((r) => r.receipt.number)).toEqual([
      "R-2026-0001",
      "R-2026-0002",
      "R-2026-0003",
    ]);
  });

  it("gives every receipt a token of its own", async () => {
    await asBoss();
    const a = await (await issue()).json();
    const b = await (await issue()).json();

    expect(a.receipt.token).not.toBe(b.receipt.token);
  });

  it("starts again at one in a new year", async () => {
    await asBoss();
    await issue();
    const next = await (
      await issue({ ...DRAFT, issuedOn: new Date(2027, 0, 3).toISOString() })
    ).json();

    expect(next.receipt.number).toBe("R-2027-0001");
  });

  it("copies the officers off the settings as they stand today", async () => {
    await asBoss();
    await SAVE_SETTINGS(
      post("/api/admin/settings", {
        membershipFee: 100,
        membershipYear: runningYear(),
        supportWhatsapp: "22241070328",
        tempPasswordHours: 1,
        secretaryName: "محمد الأمين",
        treasurerName: "أحمد سالم",
      }),
    );

    const { receipt } = await (await issue()).json();

    expect(receipt.secretary).toBe("محمد الأمين");
    expect(receipt.treasurer).toBe("أحمد سالم");
  });

  it("leaves a receipt already issued reading the officers of its own day", async () => {
    await asBoss();
    const settings = (extra: Record<string, unknown>) =>
      post("/api/admin/settings", {
        membershipFee: 100,
        membershipYear: runningYear(),
        supportWhatsapp: "22241070328",
        tempPasswordHours: 1,
        ...extra,
      });
    await SAVE_SETTINGS(settings({ secretaryName: "الأمين الأول" }));
    const { receipt } = await (await issue()).json();

    await SAVE_SETTINGS(settings({ secretaryName: "الأمين الثاني" }));

    const stored = await prisma.receipt.findFirstOrThrow({ where: { number: receipt.number } });
    expect(stored.secretary).toBe("الأمين الأول");
  });

  it("records who issued it", async () => {
    await asBoss();
    await issue();

    const row = await prisma.receipt.findFirstOrThrow();
    expect(row.issuedBy).toBe("boss");
  });

  it("writes an audit entry naming the receipt", async () => {
    await asBoss();
    const { receipt } = await (await issue()).json();

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "ISSUE_RECEIPT" } });
    expect(entry.targetLabel).toContain(receipt.number);
  });

  it("dates itself today when no date is given", async () => {
    await asBoss();

    const { receipt } = await (await issue({ ...DRAFT, issuedOn: undefined })).json();

    expect(receipt.number.startsWith(`R-${new Date().getFullYear()}-`)).toBe(true);
  });

  it("refuses an empty payer, an empty reason and an amount that is not money", async () => {
    await asBoss();

    for (const body of [
      { ...DRAFT, payerName: "   " },
      { ...DRAFT, reason: "" },
      { ...DRAFT, amount: 0 },
      { ...DRAFT, amount: -5 },
      { ...DRAFT, amount: 1.5 },
    ]) {
      expect((await issue(body)).status, JSON.stringify(body.amount ?? body)).toBe(400);
    }
    expect(await prisma.receipt.count()).toBe(0);
  });

  it("is closed to nobody at all, and to an admin scoped to one activity", async () => {
    expect((await issue()).status).toBe(401);

    await signInAsAdmin(await createAdmin("coach", "ACTIVITY"));
    expect((await issue()).status).toBe(403);
    expect(await prisma.receipt.count()).toBe(0);
  });
});

describe("cancelling a receipt", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("marks it void rather than deleting the number", async () => {
    await asBoss();
    const { receipt } = await (await issue()).json();
    const row = await prisma.receipt.findFirstOrThrow();

    const res = await voidIt(row.id, "خطأ في المبلغ");

    expect(res.status).toBe(200);
    expect((await res.json()).receipt.status).toBe("VOID");
    const after = await prisma.receipt.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.number).toBe(receipt.number);
    expect(after.voidReason).toBe("خطأ في المبلغ");
    expect(after.voidedBy).toBe("boss");
    expect(after.voidedAt).toBeInstanceOf(Date);
  });

  it("does not hand the cancelled number to the next receipt", async () => {
    await asBoss();
    await issue();
    const row = await prisma.receipt.findFirstOrThrow();
    await voidIt(row.id, "خطأ");

    const { receipt } = await (await issue()).json();

    expect(receipt.number).toBe("R-2026-0002");
  });

  it("refuses to cancel the same receipt twice", async () => {
    await asBoss();
    await issue();
    const row = await prisma.receipt.findFirstOrThrow();
    await voidIt(row.id, "خطأ");

    expect((await voidIt(row.id, "مرة أخرى")).status).toBe(404);
  });

  it("refuses a receipt that does not exist", async () => {
    await asBoss();

    expect((await voidIt("nope", "خطأ")).status).toBe(404);
  });

  it("insists on a reason", async () => {
    await asBoss();
    await issue();
    const row = await prisma.receipt.findFirstOrThrow();

    expect((await voidIt(row.id, "   ")).status).toBe(400);
    expect((await prisma.receipt.findUniqueOrThrow({ where: { id: row.id } })).status).toBe(
      "ACTIVE",
    );
  });
});

describe("the list of receipts", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is newest first", async () => {
    await asBoss();
    await issue({ ...DRAFT, issuedOn: new Date(2026, 0, 1).toISOString() });
    await issue({ ...DRAFT, issuedOn: new Date(2026, 11, 31).toISOString() });

    const { receipts } = await (await LIST(get("/api/admin/receipts"))).json();

    expect(receipts.map((r: { number: string }) => r.number)).toEqual([
      "R-2026-0002",
      "R-2026-0001",
    ]);
  });

  it("narrows to one year when asked", async () => {
    await asBoss();
    await issue({ ...DRAFT, issuedOn: new Date(2026, 5, 1).toISOString() });
    await issue({ ...DRAFT, issuedOn: new Date(2027, 5, 1).toISOString() });

    const { receipts } = await (await LIST(get("/api/admin/receipts?year=2027"))).json();

    expect(receipts).toHaveLength(1);
    expect(receipts[0].number).toBe("R-2027-0001");
  });

  it("is closed to nobody at all", async () => {
    expect((await LIST(get("/api/admin/receipts"))).status).toBe(401);
  });
});
