import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { money } from "@/lib/messages";
import {
  resetDb,
  get,
  post,
  patch,
  del,
  createUser,
  createAdmin,
  signInAsAdmin,
  withId,
} from "./helpers";

import { POST as CREATE_DONATION } from "@/app/api/admin/donations/route";
import {
  PATCH as UPDATE_DONATION,
  DELETE as DELETE_DONATION,
} from "@/app/api/admin/donations/[id]/route";
import { GET as AUDIT_LOG } from "@/app/api/admin/audit-log/route";
import { GET as HISTORY } from "@/app/api/admin/history/route";

const GIVER = "الكريم ولد الساتر";
const PHONE = "44001122";

async function marked() {
  const user = await createUser(PHONE);
  return prisma.user.update({
    where: { id: user.id },
    data: { fullName: GIVER, supportNameConfidential: true },
  });
}

async function giveSupport(userId: string, over: Record<string, unknown> = {}) {
  const made = await CREATE_DONATION(
    post("/api/admin/donations", {
      donorName: GIVER,
      donorPhone: PHONE,
      amount: 5000,
      paymentMethod: "بنكيلي",
      userId,
      ...over,
    }),
  );
  expect(made.status).toBe(201);
  return (await made.json()).donation as { id: string };
}

const storedLog = () => prisma.auditLog.findMany().then((rows) => JSON.stringify(rows));

describe("the action log and a confidential supporter", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
  });

  it("stores no name when his support is recorded", async () => {
    const giver = await marked();

    await giveSupport(giver.id);

    expect(await storedLog()).not.toContain(GIVER);
  });

  it("stores no phone and no raw row when his support is edited", async () => {
    const giver = await marked();
    const made = await giveSupport(giver.id, { proof: "slip.webp" });

    await UPDATE_DONATION(
      patch(`/api/admin/donations/${made.id}`, { amount: 6000 }),
      withId(made.id),
    );

    const stored = await storedLog();
    expect(stored).not.toContain(GIVER);
    expect(stored).not.toContain(PHONE);
    expect(stored).not.toContain("slip.webp");
  });

  it("keeps the amount and the status in the entry, so the change is still auditable", async () => {
    const giver = await marked();
    const made = await giveSupport(giver.id);

    await UPDATE_DONATION(
      patch(`/api/admin/donations/${made.id}`, { amount: 6000 }),
      withId(made.id),
    );

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "UPDATE_DONATION" } });
    expect(JSON.stringify(entry.after)).toContain("6000");
  });

  it("points the entry at the payment by id instead of naming him", async () => {
    const giver = await marked();
    const made = await giveSupport(giver.id);

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "CREATE_DONATION_MANUAL" },
    });
    expect(entry.targetLabel).toBeNull();
    expect(entry.targetType).toBe("Donation");
    expect(entry.targetId).toBe(made.id);
  });

  it("stores no name when his support is deleted", async () => {
    const giver = await marked();
    const made = await giveSupport(giver.id);

    await DELETE_DONATION(del(`/api/admin/donations/${made.id}`), withId(made.id));

    expect(await storedLog()).not.toContain(GIVER);
  });

  it("keeps the name in an entry about a giver who is not marked", async () => {
    const plain = await createUser("44003344");
    await prisma.user.update({ where: { id: plain.id }, data: { fullName: "عادي ولد عادي" } });

    await CREATE_DONATION(
      post("/api/admin/donations", {
        donorName: "عادي ولد عادي",
        amount: 5000,
        paymentMethod: "بنكيلي",
        userId: plain.id,
      }),
    );

    expect(await storedLog()).toContain("عادي ولد عادي");
  });

  it("withholds a name written before he was marked, without changing the entry", async () => {
    const giver = await createUser(PHONE);
    await prisma.user.update({ where: { id: giver.id }, data: { fullName: GIVER } });
    await giveSupport(giver.id);
    expect(await storedLog()).toContain(GIVER);

    await prisma.user.update({
      where: { id: giver.id },
      data: { supportNameConfidential: true },
    });

    const body = await (await AUDIT_LOG(get("/api/admin/audit-log"))).text();
    expect(body).not.toContain(GIVER);
    expect(body).toContain(money.anonymousDonor);
    expect(await storedLog()).toContain(GIVER);
  });

  it("gives an old entry back whole to the role that holds the promise", async () => {
    const giver = await createUser(PHONE);
    await prisma.user.update({ where: { id: giver.id }, data: { fullName: GIVER } });
    await giveSupport(giver.id);
    await prisma.user.update({
      where: { id: giver.id },
      data: { supportNameConfidential: true },
    });

    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));
    const body = await (await AUDIT_LOG(get("/api/admin/audit-log"))).text();

    expect(body).toContain(GIVER);
  });

  it("leaves the log of a giver who is not marked readable", async () => {
    const plain = await createUser("44003344");
    await prisma.user.update({ where: { id: plain.id }, data: { fullName: "عادي ولد عادي" } });
    await CREATE_DONATION(
      post("/api/admin/donations", {
        donorName: "عادي ولد عادي",
        amount: 5000,
        paymentMethod: "بنكيلي",
        userId: plain.id,
      }),
    );

    const body = await (await AUDIT_LOG(get("/api/admin/audit-log"))).text();

    expect(body).toContain("عادي ولد عادي");
  });
});

describe("one record's history and a confidential supporter", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
  });

  const historyOf = (id: string) =>
    HISTORY(get(`/api/admin/history?targetType=Donation&targetId=${id}`));

  it("withholds a name an older entry still carries", async () => {
    const giver = await createUser(PHONE);
    await prisma.user.update({ where: { id: giver.id }, data: { fullName: GIVER } });
    const donation = await giveSupport(giver.id);
    await prisma.user.update({
      where: { id: giver.id },
      data: { supportNameConfidential: true },
    });

    const body = await (await historyOf(donation.id)).text();

    expect(body).not.toContain(GIVER);
    expect(await storedLog()).toContain(GIVER);
  });

  it("gives the same entry back whole to the role that holds the promise", async () => {
    const giver = await createUser(PHONE);
    await prisma.user.update({ where: { id: giver.id }, data: { fullName: GIVER } });
    const donation = await giveSupport(giver.id);
    await prisma.user.update({
      where: { id: giver.id },
      data: { supportNameConfidential: true },
    });

    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));
    const body = await (await historyOf(donation.id)).text();

    expect(body).toContain(GIVER);
  });

  it("leaves the history of a giver who is not marked readable", async () => {
    const plain = await createUser("44003344");
    await prisma.user.update({ where: { id: plain.id }, data: { fullName: "عادي ولد عادي" } });
    const donation = await giveSupport(plain.id, { donorName: "عادي ولد عادي" });

    const body = await (await historyOf(donation.id)).text();

    expect(body).toContain("عادي ولد عادي");
  });
});
