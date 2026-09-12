import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, createAdmin, signInAsAdmin, withId, giveGift } from "./helpers";

import { PATCH as UPDATE } from "@/app/api/admin/donations/[id]/route";

async function aDonation() {
  return giveGift({ donorName: "خالد الأمين", amount: 5000, method: "بنكيلي" });
}

function edit(id: string, body: Record<string, unknown>) {
  return UPDATE(patch(`/api/admin/donations/${id}`, body), withId(id));
}

function entries(targetId: string) {
  return prisma.auditLog.findMany({ where: { targetId, action: "UPDATE_DONATION" } });
}

describe("changing where a donation landed", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("leaves a trace when only the operation number is corrected", async () => {
    const gift = await aDonation();

    const res = await edit(gift.id, { bankReference: "TR10000000001" });

    expect(res.status).toBe(200);
    const [logged] = await entries(gift.id);
    expect(logged).toBeDefined();
    expect((logged.after as Record<string, unknown>).bankReference).toBe("TR10000000001");
    expect((logged.before as Record<string, unknown>).bankReference).toBeNull();
  });

  it("leaves a trace when only the account is corrected", async () => {
    const account = await prisma.paymentAccount.findFirstOrThrow();
    const gift = await aDonation();

    const res = await edit(gift.id, { accountId: account.id });

    expect(res.status).toBe(200);
    const [logged] = await entries(gift.id);
    expect(logged).toBeDefined();
    expect((logged.after as Record<string, unknown>).accountId).toBe(account.id);
    expect((logged.before as Record<string, unknown>).accountId).toBeNull();
  });

  it("keeps the old value of both when they are cleared", async () => {
    const account = await prisma.paymentAccount.findFirstOrThrow();
    const gift = await aDonation();
    await edit(gift.id, { accountId: account.id, bankReference: "TR10000000001" });

    await edit(gift.id, { accountId: null, bankReference: null });

    const logged = await entries(gift.id);
    const last = logged[logged.length - 1];
    expect((last.before as Record<string, unknown>).accountId).toBe(account.id);
    expect((last.before as Record<string, unknown>).bankReference).toBe("TR10000000001");
    expect((last.after as Record<string, unknown>).accountId).toBeNull();
    expect((last.after as Record<string, unknown>).bankReference).toBeNull();
  });

  it("writes nothing when the body names nothing the log watches", async () => {
    const gift = await aDonation();

    await edit(gift.id, { tagIds: [] });

    expect(await entries(gift.id)).toHaveLength(0);
  });
});
