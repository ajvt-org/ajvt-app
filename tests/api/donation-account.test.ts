import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  patch,
  post,
  postForm,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  makeMember,
  withId,
} from "./helpers";

vi.mock("@/lib/imageProcessing", async (orig) => {
  const actual = await orig<typeof import("@/lib/imageProcessing")>();
  return {
    ...actual,
    processImage: async () => ({ full: Buffer.from("f"), thumbnail: Buffer.from("t") }),
  };
});

import { POST as GIVE } from "@/app/api/donations/route";
import { POST as RECORD } from "@/app/api/admin/donations/route";
import { PATCH as UPDATE } from "@/app/api/admin/donations/[id]/route";

async function aMember(phone: string, name: string) {
  const user = await createUser(phone);
  const member = await makeMember({
    fullName: name,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    userId: user.id,
  });
  return { user, member };
}

let seq = 0;

function give(userId: string, field = "userId") {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }));
  form.append("amount", "5000");
  form.append(field, userId);
  form.append("paymentMethod", "بنكيلي");
  return GIVE(postForm("/api/donations", form, { "x-forwarded-for": `10.0.1.${++seq}` }));
}

describe("the account behind a donation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an account sent as memberId rather than giving it away", async () => {
    const { user, member } = await aMember("22110044", "سالم ولد محمد");
    await signInAs(user);

    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }));
    form.append("amount", "5000");
    form.append("memberId", member.userId);
    form.append("paymentMethod", "بنكيلي");
    form.append("anonymous", "true");

    const res = await GIVE(postForm("/api/donations", form, { "x-forwarded-for": "10.0.9.1" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "بيانات غير صالحة" });
    expect(await prisma.donation.count()).toBe(0);
  });

  it("stamps the giver's account on a donation they send themselves", async () => {
    const { user, member } = await aMember("22110011", "محمد ولد أحمد");
    await signInAs(user);

    const res = await give(member.userId);
    expect(res.status).toBe(201);

    const donation = await prisma.donation.findFirstOrThrow({ where: { userId: member.userId } });
    expect(donation.userId).toBe(user.id);
  });

  it("carries the account onto the mirrored payment", async () => {
    const { user, member } = await aMember("22110022", "أحمد سالم");
    await signInAs(user);

    await give(member.userId);

    const payment = await prisma.payment.findFirstOrThrow({ where: { userId: member.userId } });
    expect(payment.userId).toBe(user.id);
  });

  it("moves the account when an admin links the donation to someone else", async () => {
    const first = await aMember("22110033", "سالم ولد محمد");
    const second = await aMember("22110044", "عبد الله ولد سالم");
    const gift = await prisma.donation.create({
      data: { donorName: "فاعل خير", amount: 5000, source: "PUBLIC", status: "ACTIVE" },
    });
    await signInAsAdmin(await createAdmin());

    const res = await UPDATE(
      patch(`/api/admin/donations/${gift.id}`, { userId: second.user.id }),
      withId(gift.id),
    );
    expect(res.status).toBe(200);

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: gift.id } });
    expect(after.userId).toBe(second.user.id);
    expect(after.userId).not.toBe(first.user.id);
  });

  it("adopts the member's name onto the gift when an admin links it", async () => {
    const { user } = await aMember("22110133", "سالم ولد محمد");
    const gift = await prisma.donation.create({
      data: { donorName: "ابو", amount: 5000, source: "PUBLIC", status: "ACTIVE" },
    });
    await signInAsAdmin(await createAdmin());

    await UPDATE(patch(`/api/admin/donations/${gift.id}`, { userId: user.id }), withId(gift.id));

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: gift.id } });
    expect(after.donorName).toBe("سالم ولد محمد");
  });

  it("carries the adopted name onto the mirrored payment", async () => {
    const { user } = await aMember("22110144", "سالم ولد محمد");
    const gift = await prisma.donation.create({
      data: { donorName: "ابو", amount: 5000, source: "PUBLIC", status: "ACTIVE" },
    });
    await signInAsAdmin(await createAdmin());

    await UPDATE(patch(`/api/admin/donations/${gift.id}`, { userId: user.id }), withId(gift.id));

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: gift.id } });
    expect(payment.donorName).toBe("سالم ولد محمد");
  });

  it("leaves the typed name alone when the account carries no name", async () => {
    const user = await prisma.user.create({ data: { phone: "22110155" } });
    const gift = await prisma.donation.create({
      data: { donorName: "ابو", amount: 5000, source: "PUBLIC", status: "ACTIVE" },
    });
    await signInAsAdmin(await createAdmin());

    await UPDATE(patch(`/api/admin/donations/${gift.id}`, { userId: user.id }), withId(gift.id));

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: gift.id } });
    expect(after.donorName).toBe("ابو");
  });

  it("leaves the name alone when the account is unlinked", async () => {
    const { user } = await aMember("22110166", "سالم ولد محمد");
    const gift = await prisma.donation.create({
      data: {
        donorName: "سالم ولد محمد",
        amount: 5000,
        source: "PUBLIC",
        status: "ACTIVE",
        userId: user.id,
      },
    });
    await signInAsAdmin(await createAdmin());

    await UPDATE(patch(`/api/admin/donations/${gift.id}`, { userId: null }), withId(gift.id));

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: gift.id } });
    expect(after.donorName).toBe("سالم ولد محمد");
  });

  it("lets a name sent with the link win over the one on the account", async () => {
    const { user } = await aMember("22110177", "سالم ولد محمد");
    const gift = await prisma.donation.create({
      data: { donorName: "ابو", amount: 5000, source: "PUBLIC", status: "ACTIVE" },
    });
    await signInAsAdmin(await createAdmin());

    await UPDATE(
      patch(`/api/admin/donations/${gift.id}`, { userId: user.id, donorName: "أبوبكر" }),
      withId(gift.id),
    );

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: gift.id } });
    expect(after.donorName).toBe("أبوبكر");
  });

  it("refuses an account that does not exist", async () => {
    const gift = await prisma.donation.create({
      data: { donorName: "فاعل خير", amount: 5000, source: "PUBLIC", status: "ACTIVE" },
    });
    await signInAsAdmin(await createAdmin());

    const res = await UPDATE(
      patch(`/api/admin/donations/${gift.id}`, { userId: "ghost" }),
      withId(gift.id),
    );

    expect(res.status).toBe(404);
  });

  it("names both accounts in the log when a wrong link is corrected", async () => {
    const first = await aMember("22110066", "سالم ولد محمد");
    const second = await aMember("22110077", "عبد الله ولد سالم");
    const gift = await prisma.donation.create({
      data: {
        donorName: "ابو",
        amount: 5000,
        source: "PUBLIC",
        status: "ACTIVE",
        userId: first.user.id,
      },
    });
    await signInAsAdmin(await createAdmin());

    await UPDATE(
      patch(`/api/admin/donations/${gift.id}`, { userId: second.user.id }),
      withId(gift.id),
    );

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "LINK_DONATION_MEMBER" },
    });
    expect(entry.targetLabel).toBe("سالم ولد محمد → عبد الله ولد سالم");
    expect(entry.before).toMatchObject({ userId: first.user.id });
    expect(entry.after).toMatchObject({ userId: second.user.id });
  });

  it("clears the account when an admin unlinks the member", async () => {
    const { user } = await aMember("22110055", "محمد الأمين");
    const gift = await prisma.donation.create({
      data: {
        donorName: "فاعل خير",
        amount: 5000,
        source: "PUBLIC",
        status: "ACTIVE",
        userId: user.id,
      },
    });
    await signInAsAdmin(await createAdmin());

    await UPDATE(patch(`/api/admin/donations/${gift.id}`, { userId: null }), withId(gift.id));

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: gift.id } });
    expect(after.userId).toBeNull();
  });

  it("links a gift to an account as it is recorded, in one step", async () => {
    const { user } = await aMember("22110088", "أبوبكر لمرابط");
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    const res = await RECORD(
      post("/api/admin/donations", {
        donorName: "ابو",
        amount: 2000,
        paymentMethod: "بنكيلي",
        userId: user.id,
      }),
    );
    expect(res.status).toBe(201);

    const donation = await prisma.donation.findFirstOrThrow();
    expect(donation.userId).toBe(user.id);
    expect(donation.donorName).toBe("ابو");
  });

  it("carries a link made at creation onto the mirrored payment", async () => {
    const { user } = await aMember("22110099", "أبوبكر لمرابط");
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await RECORD(
      post("/api/admin/donations", {
        donorName: "ابو",
        amount: 2000,
        paymentMethod: "بنكيلي",
        userId: user.id,
      }),
    );

    const payment = await prisma.payment.findFirstOrThrow();
    expect(payment.userId).toBe(user.id);
  });

  it("records a gift with no account when none is given", async () => {
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await RECORD(
      post("/api/admin/donations", { donorName: "زائر", amount: 500, paymentMethod: "بنكيلي" }),
    );

    const donation = await prisma.donation.findFirstOrThrow();
    expect(donation.userId).toBeNull();
    expect(donation.source).toBe("PUBLIC");
  });

  it("refuses to record a gift against an account that does not exist", async () => {
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    const res = await RECORD(
      post("/api/admin/donations", {
        donorName: "زائر",
        amount: 500,
        paymentMethod: "بنكيلي",
        userId: "ghost",
      }),
    );

    expect(res.status).toBe(404);
  });
});
