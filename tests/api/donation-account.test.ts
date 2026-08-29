import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  patch,
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

function give(memberId: string) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }));
  form.append("amount", "5000");
  form.append("memberId", memberId);
  form.append("paymentMethod", "بنكيلي");
  return GIVE(postForm("/api/donations", form, { "x-forwarded-for": `10.0.1.${++seq}` }));
}

describe("the account behind a donation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("stamps the giver's account on a donation they send themselves", async () => {
    const { user, member } = await aMember("22110011", "محمد ولد أحمد");
    await signInAs(user);

    const res = await give(member.id);
    expect(res.status).toBe(201);

    const donation = await prisma.donation.findFirstOrThrow({ where: { memberId: member.id } });
    expect(donation.userId).toBe(user.id);
  });

  it("carries the account onto the mirrored payment", async () => {
    const { user, member } = await aMember("22110022", "أحمد سالم");
    await signInAs(user);

    await give(member.id);

    const payment = await prisma.payment.findFirstOrThrow({ where: { memberId: member.id } });
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
      patch(`/api/admin/donations/${gift.id}`, { memberId: second.member.id }),
      withId(gift.id),
    );
    expect(res.status).toBe(200);

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: gift.id } });
    expect(after.userId).toBe(second.user.id);
    expect(after.userId).not.toBe(first.user.id);
  });

  it("clears the account when an admin unlinks the member", async () => {
    const { user, member } = await aMember("22110055", "محمد الأمين");
    const gift = await prisma.donation.create({
      data: {
        donorName: "فاعل خير",
        amount: 5000,
        source: "PUBLIC",
        status: "ACTIVE",
        memberId: member.id,
        userId: user.id,
      },
    });
    await signInAsAdmin(await createAdmin());

    await UPDATE(patch(`/api/admin/donations/${gift.id}`, { memberId: null }), withId(gift.id));

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: gift.id } });
    expect(after.userId).toBeNull();
  });
});
