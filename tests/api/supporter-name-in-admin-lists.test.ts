import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { resetDb, get, post, createUser, createAdmin, signInAsAdmin, withId } from "./helpers";

import { POST as CREATE_DONATION } from "@/app/api/admin/donations/route";
import { GET as PAYMENT_PROOFS } from "@/app/api/admin/payment-proofs/route";
import { GET as ACTIVITY_FINANCE } from "@/app/api/admin/activities/[id]/finance/route";
import { GET as EXPORT } from "@/app/api/admin/export/[dataset]/route";
import { GET as LEADERBOARD } from "@/app/api/leaderboard/route";
import { GET as PROOF_REUSE } from "@/app/api/admin/proof-reuse/route";
import { withParams } from "./helpers";

const CONFIDENTIAL = "الكريم ولد الساتر";
const PHONE = "44001122";
const PROOF = "confidential-proof.webp";
const OTHER_PROOF = "another-proof.webp";

async function signInOrdinary() {
  return signInAsAdmin(await createAdmin("ordinary", SUPER_ROLE));
}

async function signInOwner() {
  return signInAsAdmin(await createAdmin("owner", OWNER_ROLE));
}

async function confidentialGiver() {
  const user = await createUser(PHONE);
  return prisma.user.update({
    where: { id: user.id },
    data: { fullName: CONFIDENTIAL, photo: "face.webp", supportNameConfidential: true },
  });
}

async function giveSupport(userId: string, over: Record<string, unknown> = {}) {
  const made = await CREATE_DONATION(
    post("/api/admin/donations", {
      donorName: CONFIDENTIAL,
      donorPhone: PHONE,
      amount: 5000,
      paymentMethod: "بنكيلي",
      userId,
      ...over,
    }),
  );
  expect(made.status).toBe(201);
  return (await made.json()).donation as { id: string };
}

const bodyOf = (response: Response) => response.text();

describe("a confidential supporter on the admin lists", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is unnamed on the payments list", async () => {
    const giver = await confidentialGiver();
    await signInOrdinary();
    await giveSupport(giver.id, { proof: PROOF });

    const body = await bodyOf(await PAYMENT_PROOFS(get("/api/admin/payment-proofs")));

    expect(body).not.toContain(CONFIDENTIAL);
  });

  it("has no proof filename, phone or photo on the payments list", async () => {
    const giver = await confidentialGiver();
    await signInOrdinary();
    await giveSupport(giver.id, { proof: PROOF, donorPhoto: "sender.webp" });

    const body = await bodyOf(await PAYMENT_PROOFS(get("/api/admin/payment-proofs")));

    expect(body).not.toContain(PROOF);
    expect(body).not.toContain(PHONE);
    expect(body).not.toContain("sender.webp");
  });

  it("keeps his amount and his row on the payments list", async () => {
    const giver = await confidentialGiver();
    await signInOrdinary();
    await giveSupport(giver.id);

    const { proofs } = await (await PAYMENT_PROOFS(get("/api/admin/payment-proofs"))).json();

    expect(proofs).toHaveLength(1);
    expect(proofs[0].amount).toBe(5000);
  });

  it("is named on the payments list for the role that holds the promise", async () => {
    const giver = await confidentialGiver();
    await signInOrdinary();
    await giveSupport(giver.id, { proof: PROOF });
    await signInOwner();

    const body = await bodyOf(await PAYMENT_PROOFS(get("/api/admin/payment-proofs")));

    expect(body).toContain(CONFIDENTIAL);
    expect(body).toContain(PROOF);
  });

  it("is unnamed on the per activity income list", async () => {
    const activity = await prisma.activity.create({
      data: { title: "مهرجان", description: "وصف" },
    });
    const giver = await confidentialGiver();
    await signInOrdinary();
    await giveSupport(giver.id, { activityId: activity.id });

    const body = await bodyOf(
      await ACTIVITY_FINANCE(
        get(`/api/admin/activities/${activity.id}/finance`),
        withId(activity.id),
      ),
    );

    expect(body).not.toContain(CONFIDENTIAL);
  });

  it("keeps the activity income total whole", async () => {
    const activity = await prisma.activity.create({
      data: { title: "مهرجان", description: "وصف" },
    });
    const giver = await confidentialGiver();
    await signInOrdinary();
    await giveSupport(giver.id, { activityId: activity.id });

    const { totals } = await (
      await ACTIVITY_FINANCE(
        get(`/api/admin/activities/${activity.id}/finance`),
        withId(activity.id),
      )
    ).json();

    expect(totals.income).toBe(5000);
  });

  it("is unnamed in the donations export, with no phone and no linked account", async () => {
    const giver = await confidentialGiver();
    await signInOrdinary();
    await giveSupport(giver.id);

    const body = await bodyOf(
      await EXPORT(get("/api/admin/export/donations"), withParams({ dataset: "donations" })),
    );

    expect(body).not.toContain(CONFIDENTIAL);
    expect(body).not.toContain(PHONE);
    expect(body).toContain("5000");
  });

  it("is unnamed and unpictured on the public supporters board", async () => {
    const giver = await confidentialGiver();
    await signInOrdinary();
    await giveSupport(giver.id);

    const body = await bodyOf(await LEADERBOARD(get("/api/leaderboard")));

    expect(body).not.toContain(CONFIDENTIAL);
    expect(body).not.toContain("face.webp");
  });

  it("still counts on the board for the same amount", async () => {
    const giver = await confidentialGiver();
    await signInOrdinary();
    await giveSupport(giver.id);

    const { rows } = await (await LEADERBOARD(get("/api/leaderboard"))).json();

    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(5000);
  });

  it("is unnamed in the duplicate proof warning", async () => {
    const giver = await confidentialGiver();
    await signInOrdinary();
    await giveSupport(giver.id, { proof: PROOF });
    await prisma.proofImage.createMany({
      data: [
        { filename: PROOF, sha256: "same" },
        { filename: OTHER_PROOF, sha256: "same" },
      ],
    });
    await prisma.donation.create({
      data: { donorName: "زائر", amount: 100, proof: OTHER_PROOF, status: "ACTIVE" },
    });

    const body = await bodyOf(
      await PROOF_REUSE(get(`/api/admin/proof-reuse?filename=${OTHER_PROOF}`)),
    );

    expect(body).not.toContain(CONFIDENTIAL);
  });

  it("leaves a giver who is not marked exactly as they were", async () => {
    const plain = await createUser("44003344");
    await prisma.user.update({ where: { id: plain.id }, data: { fullName: "عادي ولد عادي" } });
    await signInOrdinary();
    await CREATE_DONATION(
      post("/api/admin/donations", {
        donorName: "عادي ولد عادي",
        donorPhone: "44003344",
        amount: 5000,
        paymentMethod: "بنكيلي",
        userId: plain.id,
      }),
    );

    const proofs = await bodyOf(await PAYMENT_PROOFS(get("/api/admin/payment-proofs")));
    const board = await bodyOf(await LEADERBOARD(get("/api/leaderboard")));

    expect(proofs).toContain("عادي ولد عادي");
    expect(proofs).toContain("44003344");
    expect(board).toContain("عادي ولد عادي");
  });

  it("leaves an anonymous giver who is not marked visible to an admin", async () => {
    const plain = await createUser("44005566");
    await prisma.user.update({ where: { id: plain.id }, data: { fullName: "مجهول ولد مجهول" } });
    await signInOrdinary();
    const made = await giveSupport(plain.id, { donorName: "مجهول ولد مجهول" });
    await prisma.donation.update({ where: { id: made.id }, data: { anonymous: true } });
    await prisma.payment.update({ where: { id: made.id }, data: { anonymous: true } });

    const proofs = await bodyOf(await PAYMENT_PROOFS(get("/api/admin/payment-proofs")));
    const board = await bodyOf(await LEADERBOARD(get("/api/leaderboard")));

    expect(proofs).toContain("مجهول ولد مجهول");
    expect(board).not.toContain("مجهول ولد مجهول");
  });
});
