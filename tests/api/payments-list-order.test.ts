import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, get, patch, post, createAdmin, signInAsAdmin, withId } from "./helpers";
import { GET as PROOFS } from "@/app/api/admin/payment-proofs/route";
import { POST as RECORD } from "@/app/api/admin/donations/route";
import { PATCH as UPDATE } from "@/app/api/admin/donations/[id]/route";

async function record(donorName: string, paidOn: string) {
  const { donation } = await (
    await RECORD(
      post("/api/admin/donations", { donorName, amount: 5000, paymentMethod: "بنكيلي", paidOn }),
    )
  ).json();
  return donation.id as string;
}

async function order() {
  const body = await (await PROOFS(get("/api/admin/payment-proofs"))).json();
  return body.proofs.map((p: { id: string }) => p.id);
}

describe("the order the payments list arrives in", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("puts the most recent payment first, whatever order the rows were typed in", async () => {
    const june = await record("جوان", "2026-06-10");
    const august = await record("أوت", "2026-08-10");
    const july = await record("جويلية", "2026-07-10");

    expect(await order()).toEqual([august, july, june]);
  });

  it("leaves a payment where it is when an admin edits it", async () => {
    const june = await record("جوان", "2026-06-10");
    const august = await record("أوت", "2026-08-10");
    const july = await record("جويلية", "2026-07-10");

    await UPDATE(patch(`/api/admin/donations/${june}`, { amount: 9000 }), withId(june));

    expect(await order()).toEqual([august, july, june]);
  });

  it("moves a payment only when the day it was paid moves", async () => {
    const june = await record("جوان", "2026-06-10");
    const august = await record("أوت", "2026-08-10");

    await UPDATE(patch(`/api/admin/donations/${june}`, { paidOn: "2026-09-01" }), withId(june));

    expect(await order()).toEqual([june, august]);
  });
});
