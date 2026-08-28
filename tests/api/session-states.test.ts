import { describe, it, expect, beforeEach } from "vitest";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { resetDb, post } from "./helpers";
import { setCookie, clearCookies } from "./cookieJar";

import { GET as ME } from "@/app/api/user/me/route";
import { POST as PASSWORD } from "@/app/api/user/password/route";
import { POST as SUBSCRIBE } from "@/app/api/push/subscribe/route";
import { GET as QUIZ_MINE } from "@/app/api/quiz/competitions/route";
import { POST as MEMBERS } from "@/app/api/members/route";
import { GET as ADMIN_MEMBERS } from "@/app/api/admin/members/route";
import { GET as SETTINGS } from "@/app/api/settings/route";

const HOUR = 60 * 60 * 1000;

type StateName =
  | "visitor"
  | "accountOnly"
  | "memberPending"
  | "memberActive"
  | "memberRejected"
  | "revoked"
  | "tempPassword";

async function makeUser(phone: string) {
  return prisma.user.create({ data: { phone, password: await bcrypt.hash("secret", 4) } });
}

async function addMember(userId: string, phone: string | null, status: string, name: string) {
  return prisma.member.create({
    data: {
      userId,
      fullName: name,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: status as "PENDING" | "ACTIVE" | "REJECTED",
      memberNumber: status === "ACTIVE" ? `AJVT-2026-${(phone ?? "0000").slice(-4)}` : null,
    },
  });
}

async function enter(state: StateName) {
  clearCookies();
  if (state === "visitor") return;

  const user = await makeUser("2233" + Math.floor(1000 + Math.random() * 8999));
  if (state === "memberPending") await addMember(user.id, user.phone, "PENDING", "أحمد");
  if (state === "memberActive") await addMember(user.id, user.phone, "ACTIVE", "محمد");
  if (state === "memberRejected") await addMember(user.id, user.phone, "REJECTED", "سالم");

  const tokenVersion = user.tokenVersion;
  if (state === "revoked") {
    await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
  }
  if (state === "tempPassword") {
    await prisma.user.update({
      where: { id: user.id },
      data: { tempPasswordExpiresAt: new Date(Date.now() + HOUR) },
    });
  }

  setCookie("user_token", await signToken({ typ: "user", userId: user.id, tokenVersion }));
}

const SIGNED_IN: StateName[] = ["accountOnly", "memberPending", "memberActive", "memberRejected"];
const ALL: StateName[] = [...SIGNED_IN, "visitor", "revoked", "tempPassword"];

describe("who the API serves", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("GET /api/user/me", () => {
    it.each(SIGNED_IN)("serves %s", async (state) => {
      await enter(state);
      expect((await ME()).status).toBe(200);
    });

    it.each(["visitor", "revoked"] as StateName[])("refuses %s with 401", async (state) => {
      await enter(state);
      expect((await ME()).status).toBe(401);
    });

    it("refuses a locked account with 403, not 401, since the session is real", async () => {
      await enter("tempPassword");
      expect((await ME()).status).toBe(403);
    });

    it("returns no members for an account that has none", async () => {
      await enter("accountOnly");
      expect((await (await ME()).json()).members).toEqual([]);
    });
  });

  describe("the rest of the member API", () => {
    const ROUTES = {
      "push/subscribe": () =>
        SUBSCRIBE(
          post("/api/push/subscribe", {
            endpoint: "https://push.example/1",
            keys: { p256dh: "a", auth: "b" },
          }),
        ),
      members: () => MEMBERS(post("/api/members", {})),
    };

    it("quiz/competitions answers a visitor with the public competitions", async () => {
      await enter("visitor");
      const res = await QUIZ_MINE();

      expect(res.status).toBe(200);
      expect((await res.json()).canPlay).toBe(false);
    });

    it("quiz/competitions still locks out an account on a temporary password", async () => {
      await enter("tempPassword");
      expect((await QUIZ_MINE()).status).toBe(403);
    });

    for (const [name, call] of Object.entries(ROUTES)) {
      it(`${name} refuses a visitor`, async () => {
        await enter("visitor");
        expect((await call()).status).toBe(401);
      });

      it(`${name} refuses a revoked session`, async () => {
        await enter("revoked");
        expect((await call()).status).toBe(401);
      });

      it(`${name} refuses a locked account`, async () => {
        await enter("tempPassword");
        expect((await call()).status).toBe(403);
      });
    }
  });

  describe("changing a password", () => {
    it("is the one thing a locked account may still do", async () => {
      await enter("tempPassword");
      expect(
        (await PASSWORD(post("/api/user/password", { newPassword: "chosenwell" }))).status,
      ).toBe(200);
    });

    it("is refused to a revoked session like everything else", async () => {
      await enter("revoked");
      expect(
        (
          await PASSWORD(
            post("/api/user/password", { currentPassword: "secret", newPassword: "x2x2x2x2" }),
          )
        ).status,
      ).toBe(401);
    });

    it.each(SIGNED_IN)("still needs the current password from %s", async (state) => {
      await enter(state);
      expect(
        (await PASSWORD(post("/api/user/password", { newPassword: "chosenwell" }))).status,
      ).toBe(400);
    });
  });

  describe("the admin API", () => {
    it.each(ALL)("is closed to %s, whatever their member session", async (state) => {
      await enter(state);
      expect((await ADMIN_MEMBERS()).status).toBe(401);
    });
  });

  describe("the public API", () => {
    it.each(ALL)("stays open to %s", async (state) => {
      await enter(state);
      expect((await SETTINGS()).status).toBe(200);
    });
  });
});
