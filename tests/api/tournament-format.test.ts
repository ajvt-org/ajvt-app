import { describe, it, expect, beforeEach } from "vitest";
import { POST as CREATE_ACTIVITY } from "@/app/api/admin/activities/route";
import { PATCH as UPDATE_ACTIVITY } from "@/app/api/admin/activities/[id]/route";
import {
  GET as LIST_GROUPS,
  POST as CREATE_GROUP,
} from "@/app/api/admin/activities/[id]/groups/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, createAdmin, signInAsAdmin } from "./helpers";

const activityBody = (over: Record<string, unknown> = {}) => ({
  title: "بطولة",
  description: "وصف البطولة",
  isTournament: true,
  ...over,
});

function create(body: Record<string, unknown>) {
  return CREATE_ACTIVITY(post("/api/admin/activities", body));
}

function withId(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function team(activityId: string, name: string) {
  return prisma.team.create({ data: { activityId, name } });
}

describe("tournament format", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("defaults a tournament to knockout when none is chosen", async () => {
    const { activity } = await (await create(activityBody())).json();

    expect(activity.format).toBe("KNOCKOUT");
  });

  it("takes the format the admin picked", async () => {
    const { activity } = await (
      await create(activityBody({ format: "GROUPS_THEN_KNOCKOUT" }))
    ).json();

    expect(activity.format).toBe("GROUPS_THEN_KNOCKOUT");
  });

  it("leaves a plain activity with no format at all", async () => {
    const { activity } = await (
      await create(activityBody({ isTournament: false, format: undefined }))
    ).json();

    expect(activity.format).toBeNull();
  });

  it("refuses a group in a knockout tournament", async () => {
    const { activity } = await (await create(activityBody())).json();

    const res = await CREATE_GROUP(
      post(`/api/admin/activities/${activity.id}/groups`, { name: "المجموعة أ" }),
      withId(activity.id),
    );

    expect(res.status).toBe(409);
    expect(await prisma.group.count()).toBe(0);
  });

  it("allows groups when the format asks for them", async () => {
    const { activity } = await (
      await create(activityBody({ format: "GROUPS_THEN_KNOCKOUT" }))
    ).json();

    const res = await CREATE_GROUP(
      post(`/api/admin/activities/${activity.id}/groups`, { name: "المجموعة أ" }),
      withId(activity.id),
    );

    expect(res.status).toBe(201);
  });

  it("reports the format alongside the groups", async () => {
    const { activity } = await (
      await create(activityBody({ format: "GROUPS_THEN_KNOCKOUT" }))
    ).json();

    const body = await (
      await LIST_GROUPS(
        post(`/api/admin/activities/${activity.id}/groups`, {}),
        withId(activity.id),
      )
    ).json();

    expect(body.format).toBe("GROUPS_THEN_KNOCKOUT");
  });

  it("lets the format change while nothing has been played", async () => {
    const { activity } = await (await create(activityBody())).json();

    const res = await UPDATE_ACTIVITY(
      patch(`/api/admin/activities/${activity.id}`, { format: "GROUPS_THEN_KNOCKOUT" }),
      withId(activity.id),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).activity.format).toBe("GROUPS_THEN_KNOCKOUT");
  });

  it("refuses to change the format once a match exists", async () => {
    const { activity } = await (await create(activityBody())).json();
    const home = await team(activity.id, "أ");
    const away = await team(activity.id, "ب");
    await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id },
    });

    const res = await UPDATE_ACTIVITY(
      patch(`/api/admin/activities/${activity.id}`, { format: "GROUPS_THEN_KNOCKOUT" }),
      withId(activity.id),
    );

    expect(res.status).toBe(409);
    const row = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    expect(row.format).toBe("KNOCKOUT");
  });

  it("accepts a no-op format write after matches exist", async () => {
    const { activity } = await (await create(activityBody())).json();
    const home = await team(activity.id, "أ");
    const away = await team(activity.id, "ب");
    await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id },
    });

    const res = await UPDATE_ACTIVITY(
      patch(`/api/admin/activities/${activity.id}`, { format: "KNOCKOUT" }),
      withId(activity.id),
    );

    expect(res.status).toBe(200);
  });
});
