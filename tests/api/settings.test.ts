import { describe, it, expect, beforeEach } from "vitest";
import { GET as publicGet } from "@/app/api/settings/route";
import { GET as adminGet, PATCH } from "@/app/api/admin/settings/route";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { resetDb, post, createAdmin, signInAsAdmin } from "./helpers";

const valid = {
  membershipFee: 250,
  supportWhatsapp: "22299887766",
  tempPasswordHours: 12,
  whatsappGroup: "https://chat.whatsapp.com/abc",
};

describe("GET /api/settings", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is public, members need the fee before they have an account", async () => {
    const res = await publicGet();

    expect(res.status).toBe(200);
    expect((await res.json()).settings).toEqual(DEFAULT_SETTINGS);
  });

  it("returns the saved values once an admin changes them", async () => {
    await signInAsAdmin(await createAdmin());
    await PATCH(post("/api/admin/settings", valid));

    const { settings } = await (await publicGet()).json();
    expect(settings.membershipFee).toBe(250);
    expect(settings.supportWhatsapp).toBe("22299887766");
  });
});

describe("PATCH /api/admin/settings", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const res = await PATCH(post("/api/admin/settings", valid));

    expect(res.status).toBe(401);
    expect(await prisma.appSettings.count()).toBe(0);
  });

  it("refuses an admin scoped to another section", async () => {
    await signInAsAdmin(await createAdmin("activities-admin", "ACTIVITIES"));

    const res = await PATCH(post("/api/admin/settings", valid));

    expect(res.status).toBe(403);
    expect(await prisma.appSettings.count()).toBe(0);
  });

  it("saves for a super admin and reads back", async () => {
    await signInAsAdmin(await createAdmin("super-admin", "SUPER"));

    const res = await PATCH(post("/api/admin/settings", valid));

    expect(res.status).toBe(200);
    expect((await res.json()).settings.membershipFee).toBe(250);
    expect((await adminGet()).status).toBe(200);
  });

  it("updates the same row instead of creating a second one", async () => {
    await signInAsAdmin(await createAdmin());
    await PATCH(post("/api/admin/settings", valid));
    await PATCH(post("/api/admin/settings", { ...valid, membershipFee: 500 }));

    expect(await prisma.appSettings.count()).toBe(1);
    expect((await prisma.appSettings.findFirstOrThrow()).membershipFee).toBe(500);
  });

  it("rejects a fee that is not a positive whole number", async () => {
    await signInAsAdmin(await createAdmin());

    for (const membershipFee of [0, -100, 1.5, "abc"]) {
      const res = await PATCH(post("/api/admin/settings", { ...valid, membershipFee }));
      expect(res.status, String(membershipFee)).toBe(400);
      expect(await res.json()).toEqual({ error: "المبلغ يجب أن يكون رقماً صحيحاً موجباً" });
    }
    expect(await prisma.appSettings.count()).toBe(0);
  });

  it("rejects a support number that is not digits", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await PATCH(post("/api/admin/settings", { ...valid, supportWhatsapp: "+222 41" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "رقم الواتساب غير صالح" });
  });

  it("rejects a group link that is not https", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await PATCH(post("/api/admin/settings", { ...valid, whatsappGroup: "chat.me" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "الرابط غير صالح" });
  });
});
