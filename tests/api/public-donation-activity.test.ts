import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { activities, money } from "@/lib/messages";
import { resetDb, postForm, get, patch, withId, createAdmin, signInAsAdmin } from "./helpers";

vi.mock("@/lib/imageProcessing", async (orig) => {
  const actual = await orig<typeof import("@/lib/imageProcessing")>();
  return {
    ...actual,
    processImage: async () => ({ full: Buffer.from("f"), thumbnail: Buffer.from("t") }),
  };
});

import { POST as DONATE } from "@/app/api/donations/route";
import { GET as ACTIVITY } from "@/app/api/activities/[id]/route";
import { PATCH as REVIEW } from "@/app/api/admin/donations/[id]/route";
import { GET as FINANCE } from "@/app/api/admin/activities/[id]/finance/route";

let seq = 0;
const nextIp = () => `10.1.0.${++seq}`;

function give(fields: Record<string, string> = {}) {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }));
  const all = { amount: "5000", paymentMethod: "بنكيلي", anonymous: "true", ...fields };
  for (const [k, v] of Object.entries(all)) fd.append(k, v);
  return DONATE(postForm("/api/donations", fd, { "x-forwarded-for": nextIp() }));
}

function activity(data: { published?: boolean; isOpen?: boolean } = {}) {
  return prisma.activity.create({ data: { title: "القافلة الصحية", description: "وصف", ...data } });
}

const readActivity = (id: string) => ACTIVITY(get(`/api/activities/${id}`), withId(id));

describe("a public gift started from an activity", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("arrives attached to that activity and waiting for review", async () => {
    const caravan = await activity();

    const res = await give({ activityId: caravan.id });

    expect(res.status).toBe(201);
    const gift = await prisma.payment.findFirstOrThrow();
    expect(gift.activityId).toBe(caravan.id);
    expect(gift.purpose).toBe("ACTIVITY");
    expect(gift.status).toBe("PENDING");
  });

  it("lands on the activity ledger once approved, with no other admin step", async () => {
    const caravan = await activity();
    await give({ activityId: caravan.id });
    const gift = await prisma.payment.findFirstOrThrow();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await REVIEW(patch(`/api/admin/donations/${gift.id}`, { status: "ACTIVE" }), withId(gift.id));

    const res = await FINANCE(
      get(`/api/admin/activities/${caravan.id}/finance`),
      withId(caravan.id),
    );
    expect((await res.json()).totals.income).toBe(5000);
  });

  it("stays general support when no activity is named", async () => {
    await activity();

    expect((await give()).status).toBe(201);
    const gift = await prisma.payment.findFirstOrThrow();
    expect(gift.activityId).toBeNull();
    expect(gift.purpose).toBe("DONATION");
  });

  it("reads an empty activity as general support", async () => {
    expect((await give({ activityId: "  " })).status).toBe(201);
    expect((await prisma.payment.findFirstOrThrow()).activityId).toBeNull();
  });

  it.each([
    ["does not exist", null],
    ["is not published", { published: false }],
    ["is closed", { isOpen: false }],
  ])("is refused when the activity %s", async (_label, state) => {
    const id = state ? (await activity(state)).id : "missing";

    const res = await give({ activityId: id });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(money.activityTakesNoGifts);
    expect(await prisma.payment.count()).toBe(0);
  });
});

describe("the public read of one activity", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("names a published activity and says whether it takes a gift", async () => {
    const open = await activity();
    const closed = await activity({ isOpen: false });

    expect((await (await readActivity(open.id)).json()).activity).toEqual({
      id: open.id,
      title: "القافلة الصحية",
      takesGifts: true,
    });
    expect((await (await readActivity(closed.id)).json()).activity.takesGifts).toBe(false);
  });

  it.each([
    ["an unpublished activity", true],
    ["an activity that does not exist", false],
  ])("answers the same not found for %s", async (_label, exists) => {
    const id = exists ? (await activity({ published: false })).id : "missing";

    const res = await readActivity(id);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe(activities.notFound);
  });
});
