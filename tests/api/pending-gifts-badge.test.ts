import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { donationMirrorOf, mirrorDonation } from "@/lib/paymentMirror";
import { resetDb, get, postForm, createAdmin, signInAsAdmin, makeMember } from "./helpers";

vi.mock("@/lib/imageProcessing", async (orig) => {
  const actual = await orig<typeof import("@/lib/imageProcessing")>();
  return {
    ...actual,
    processImage: async () => ({ full: Buffer.from("f"), thumbnail: Buffer.from("t") }),
  };
});

import { GET as SUMMARY } from "@/app/api/admin/notifications/summary/route";
import { POST as GIVE } from "@/app/api/donations/route";

let seq = 0;

async function give(status: "PENDING" | "ACTIVE" | "REJECTED") {
  const donation = await prisma.donation.create({
    data: { donorName: "زائر", amount: 500, source: "PUBLIC", status },
  });
  await mirrorDonation(prisma, donationMirrorOf(donation));
  return donation;
}

async function pendingGifts() {
  const body = await (await SUMMARY(get("/api/admin/notifications/summary"))).json();
  return body.pendingDonations as number;
}

describe("the badge counting gifts waiting for review", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("counts a gift that is waiting and leaves a settled one out", async () => {
    await give("PENDING");
    await give("PENDING");
    await give("ACTIVE");
    await give("REJECTED");

    expect(await pendingGifts()).toBe(2);
  });

  it("leaves a membership waiting for review out, since it is counted on its own", async () => {
    await makeMember({
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      paymentProof: "membership.webp",
      paidAmount: MEMBERSHIP_FEE,
      status: "PENDING",
    });

    const body = await (await SUMMARY(get("/api/admin/notifications/summary"))).json();

    expect(body.pendingMembers).toBe(1);
    expect(body.pendingDonations).toBe(0);
  });

  it("counts a gift a visitor sent through the public form", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }));
    form.append("amount", "5000");
    form.append("paymentMethod", "بنكيلي");
    form.append("anonymous", "true");
    await GIVE(postForm("/api/donations", form, { "x-forwarded-for": `10.0.7.${++seq}` }));

    expect(await pendingGifts()).toBe(1);
  });

  it("shows nothing to an admin who does not reach the money", async () => {
    await give("PENDING");
    await signInAsAdmin(await createAdmin("activities-only", "ACTIVITIES"));

    expect(await pendingGifts()).toBe(0);
  });
});
