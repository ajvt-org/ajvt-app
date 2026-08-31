import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, createAdmin, signInAsAdmin, createUsers, makeMember } from "./helpers";
import { GET as PROOFS } from "@/app/api/admin/payment-proofs/route";
import { POST as RECORD } from "@/app/api/admin/donations/route";

async function proofFor(id: string) {
  const body = await (await PROOFS(get("/api/admin/payment-proofs"))).json();
  return body.proofs.find((p: { id: string }) => p.id === id);
}

describe("what the payments list hands the card", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("names the receipt issued for a gift, so the card can link to it", async () => {
    const { donation } = await (
      await RECORD(
        post("/api/admin/donations", {
          donorName: "أحمد سالم",
          amount: 5000,
          paymentMethod: "بنكيلي",
        }),
      )
    ).json();

    const proof = await proofFor(donation.id);
    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(proof.receipt).toMatchObject({
      number: receipt.number,
      status: "ACTIVE",
      token: receipt.token,
    });
  });

  it("hands back the account and the giver's choice, not just a name", async () => {
    const [user] = await createUsers(1);
    await makeMember({
      userId: user.id,
      fullName: "أبوبكر لمرابط",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    const { donation } = await (
      await RECORD(
        post("/api/admin/donations", {
          donorName: "ابو",
          amount: 2000,
          paymentMethod: "بنكيلي",
          userId: user.id,
        }),
      )
    ).json();

    const proof = await proofFor(donation.id);
    expect(proof.userId).toBe(user.id);
    expect(proof.anonymous).toBe(false);
    expect(proof.donorName).toBe("ابو");
    expect(proof.memberName).toBe("أبوبكر لمرابط");
  });

  it("names the account behind a membership proof", async () => {
    const [user] = await createUsers(1);
    await makeMember({
      userId: user.id,
      fullName: "محمد المصطفى",
      paymentMethod: "بنكيلي",
      paymentProof: "membership.webp",
      status: "PENDING",
    });

    expect((await proofFor(user.id)).userId).toBe(user.id);
  });

  it("names the account behind an activity proof, which is not the proof's own id", async () => {
    const [user] = await createUsers(1);
    const activity = await prisma.activity.create({
      data: { title: "دوري الرابطة", description: "وصف" },
    });
    const registration = await prisma.activityRegistration.create({
      data: { userId: user.id, activityId: activity.id, paymentProof: "activity.webp" },
    });

    const proof = await proofFor(registration.id);
    expect(proof.userId).toBe(user.id);
    expect(proof.id).not.toBe(proof.userId);
  });

  it("leaves the account off a gift nobody has linked", async () => {
    const gift = await prisma.donation.create({
      data: { donorName: "زائر", amount: 500, source: "PUBLIC", status: "ACTIVE" },
    });

    expect((await proofFor(gift.id)).userId).toBeNull();
  });

  it("leaves the receipt out of a gift that has none yet", async () => {
    const gift = await prisma.donation.create({
      data: { donorName: "زائر", amount: 500, source: "PUBLIC", status: "PENDING" },
    });

    expect((await proofFor(gift.id)).receipt).toBeNull();
  });
});
