import { describe, it, expect, beforeEach } from "vitest";
import { GET as publicGet } from "@/app/api/settings/route";
import { GET as adminGet, PATCH } from "@/app/api/admin/settings/route";
import { prisma } from "@/lib/prisma";
import { defaultSettings } from "@/lib/settings";
import { runningYear } from "@/lib/membershipYear";
import { resetDb, post, createAdmin, signInAsAdmin } from "./helpers";

const valid = {
  membershipFee: 250,
  membershipYear: runningYear(),
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
    expect((await res.json()).settings).toEqual(defaultSettings());
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

  it("rejects a membership year outside the bounds", async () => {
    await signInAsAdmin(await createAdmin());

    for (const membershipYear of [2019, runningYear() + 2, 2026.5, "abc"]) {
      const res = await PATCH(post("/api/admin/settings", { ...valid, membershipYear }));
      expect(res.status, String(membershipYear)).toBe(400);
      expect(await res.json()).toEqual({ error: "سنة العضوية غير صالحة" });
    }
    expect(await prisma.appSettings.count()).toBe(0);
  });

  it("lets the association pin next year before it starts", async () => {
    await signInAsAdmin(await createAdmin());
    const next = runningYear() + 1;

    const res = await PATCH(post("/api/admin/settings", { ...valid, membershipYear: next }));

    expect(res.status).toBe(200);
    expect((await res.json()).settings.membershipYear).toBe(next);
  });

  it("keeps the two officers who sign the receipts", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await PATCH(
      post("/api/admin/settings", {
        ...valid,
        secretaryName: "  محمد الأمين  ",
        treasurerName: "أحمد سالم",
      }),
    );

    expect(res.status).toBe(200);
    const { settings } = await res.json();
    expect(settings.secretaryName).toBe("محمد الأمين");
    expect(settings.treasurerName).toBe("أحمد سالم");
  });

  it("leaves the officers empty until somebody fills them in", async () => {
    await signInAsAdmin(await createAdmin());

    const { settings } = await (await PATCH(post("/api/admin/settings", valid))).json();

    expect(settings.secretaryName).toBeNull();
    expect(settings.treasurerName).toBeNull();
  });

  it("rejects an officer name too long to fit on the sheet", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await PATCH(
      post("/api/admin/settings", { ...valid, secretaryName: "م".repeat(61) }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "الاسم طويل جداً" });
  });

  it("rejects a group link that is not https", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await PATCH(post("/api/admin/settings", { ...valid, whatsappGroup: "chat.me" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "الرابط غير صالح" });
  });
});
