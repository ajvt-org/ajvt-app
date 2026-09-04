import { describe, it, expect, beforeEach } from "vitest";
import { GET as adminRoute } from "@/app/api/admin/payment-methods/offered/route";
import { GET as publicRoute } from "@/app/api/payment-methods/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";

const ADMIN_ONLY = "نقداً";

async function namesFrom(res: Response) {
  const { methods } = await res.json();
  return (methods ?? []).map((method: { name: string }) => method.name);
}

describe("the method list an admin form reads", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses anyone who is not an admin", async () => {
    const res = await adminRoute(get("/api/admin/payment-methods/offered"));
    expect(res.status).toBe(401);
  });

  it("carries the method reserved for the admin", async () => {
    await signInAsAdmin(await createAdmin());
    const names = await namesFrom(await adminRoute(get("/api/admin/payment-methods/offered")));
    expect(names).toContain(ADMIN_ONLY);
  });

  it("carries a method that has no account, which no member may pick", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.paymentAccount.deleteMany();
    const names = await namesFrom(await adminRoute(get("/api/admin/payment-methods/offered")));
    expect(names.length).toBeGreaterThan(0);
    expect(await namesFrom(await publicRoute(get("/api/payment-methods")))).toEqual([]);
  });

  it("leaves out a method an admin stopped", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.paymentMethod.update({ where: { name: ADMIN_ONLY }, data: { active: false } });
    const names = await namesFrom(await adminRoute(get("/api/admin/payment-methods/offered")));
    expect(names).not.toContain(ADMIN_ONLY);
  });
});

describe("the method list anybody may read", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("names no method reserved for the admin", async () => {
    const names = await namesFrom(await publicRoute(get("/api/payment-methods")));
    expect(names).not.toContain(ADMIN_ONLY);
    expect(names.length).toBeGreaterThan(0);
  });
});
