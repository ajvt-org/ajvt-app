import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/activities/route";
import { GET, PATCH, DELETE } from "@/app/api/admin/activities/[id]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, createAdmin, signInAsAdmin, withId } from "./helpers";

async function anActivity() {
  return prisma.activity.create({
    data: {
      title: "دوري كرة القدم",
      description: "دوري سنوي بين فرق القرية",
      period: "24 - 29 أغسطس",
      capacity: 32,
    },
  });
}

describe("reading one activity's core facts", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("answers with the title and the tournament settings", async () => {
    const a = await prisma.activity.create({
      data: {
        title: "بطولة الدامة",
        description: "فردية",
        isTournament: true,
        format: "KNOCKOUT",
        minTeamSize: 1,
        maxTeamSize: 1,
      },
    });

    const body = await (await GET(get(`/api/admin/activities/${a.id}`), withId(a.id))).json();

    expect(body.activity).toMatchObject({
      title: "بطولة الدامة",
      isTournament: true,
      format: "KNOCKOUT",
      minTeamSize: 1,
      maxTeamSize: 1,
    });
  });

  it("carries the match shape from creation and locks it with the first match", async () => {
    const created = await (
      await POST(
        post("/api/admin/activities", {
          title: "بطولة الورق",
          description: "أزواج",
          isTournament: true,
          format: "KNOCKOUT",
          matchShape: "SERIES",
          minTeamSize: 2,
          maxTeamSize: 2,
        }),
      )
    ).json();

    expect(created.activity).toMatchObject({
      matchShape: "SERIES",
      minTeamSize: 2,
      maxTeamSize: 2,
    });

    const home = await prisma.team.create({
      data: { activityId: created.activity.id, name: "أ" },
    });
    const away = await prisma.team.create({
      data: { activityId: created.activity.id, name: "ب" },
    });
    await prisma.match.create({
      data: { activityId: created.activity.id, homeTeamId: home.id, awayTeamId: away.id },
    });

    const res = await PATCH(
      post(`/api/admin/activities/${created.activity.id}`, { matchShape: "FOOTBALL" }),
      withId(created.activity.id),
    );

    expect(res.status).toBe(409);
  });

  it("says not found for an unknown id", async () => {
    expect((await GET(get("/api/admin/activities/nope"), withId("nope"))).status).toBe(404);
  });
});

describe("activity audit detail", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("records the target and the new values on create", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await POST(
      post("/api/admin/activities", {
        title: "بطولة الشطرنج",
        description: "منافسة في لعبة الشطرنج",
      }),
    );

    expect(res.status).toBe(201);
    const activity = await prisma.activity.findFirstOrThrow();
    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "CREATE_ACTIVITY" } });
    expect(entry.targetType).toBe("Activity");
    expect(entry.targetId).toBe(activity.id);
    expect(entry.adminRole).toBe("SUPER");
    expect(entry.after).toMatchObject({ title: "بطولة الشطرنج" });
  });

  it("records both sides of an edit", async () => {
    await signInAsAdmin(await createAdmin());
    const activity = await anActivity();

    await PATCH(
      post(`/api/admin/activities/${activity.id}`, { capacity: 64 }),
      withId(activity.id),
    );

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "UPDATE_ACTIVITY" } });
    expect(entry.before).toMatchObject({ capacity: 32 });
    expect(entry.after).toMatchObject({ capacity: 64 });
  });

  it("keeps the row it deleted", async () => {
    await signInAsAdmin(await createAdmin());
    const activity = await anActivity();

    await DELETE(post(`/api/admin/activities/${activity.id}`, {}), withId(activity.id));

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "DELETE_ACTIVITY" } });
    expect(entry.targetId).toBe(activity.id);
    expect(entry.before).toMatchObject({ title: "دوري كرة القدم", capacity: 32 });
  });

  it("refuses an anonymous caller and writes nothing", async () => {
    const activity = await anActivity();

    const res = await PATCH(
      post(`/api/admin/activities/${activity.id}`, { capacity: 64 }),
      withId(activity.id),
    );

    expect(res.status).toBe(401);
    expect(await prisma.auditLog.count()).toBe(0);
  });
});
