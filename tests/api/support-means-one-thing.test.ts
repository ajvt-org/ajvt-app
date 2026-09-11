import { describe, it, expect, beforeEach } from "vitest";
import { GET as proofsRoute } from "@/app/api/admin/payment-proofs/route";
import { GET as supportersRoute } from "@/app/api/admin/supporters/route";
import { prisma } from "@/lib/prisma";
import { runningYear } from "@/lib/membershipYear";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { resetDb, get, createAdmin, signInAsAdmin, makeMember } from "./helpers";

const YEAR = runningYear();

async function memberPayingAbove(paidAmount: number, over: Record<string, unknown> = {}) {
  return makeMember({
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount,
    membershipYear: YEAR,
    ...over,
  });
}

async function membershipRows() {
  const { proofs } = await (await proofsRoute(get("/api/admin/payment-proofs"))).json();
  return (proofs as Record<string, unknown>[]).filter((r) => r.kind === "MEMBERSHIP");
}

async function supporters() {
  const res = await supportersRoute(get("/api/admin/supporters") as never);
  return (await res.json()) as { rows: { name: string; sources?: string[] }[]; count: number };
}

describe("a member who paid above the fee", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("is reachable on the payments screen even with no proof image", async () => {
    await memberPayingAbove(MEMBERSHIP_FEE + 1000);

    const [row] = await membershipRows();

    expect(row).toBeDefined();
    expect(row.amount).toBe(MEMBERSHIP_FEE + 1000);
    expect(row.feeApplied).toBe(MEMBERSHIP_FEE);
    expect(row.memberName).toBe("محمد ولد أحمد");
  });

  it("carries nothing above the fee when the payment is only the fee", async () => {
    await memberPayingAbove(MEMBERSHIP_FEE, { paymentProof: "proof.webp" });

    const [row] = await membershipRows();

    expect(row.amount).toBe(MEMBERSHIP_FEE);
    expect(row.feeApplied).toBe(MEMBERSHIP_FEE);
  });

  it("stays off the payments screen when it is only the fee and has no proof", async () => {
    await memberPayingAbove(MEMBERSHIP_FEE);

    expect(await membershipRows()).toHaveLength(0);
  });

  it("counts on the supporters list for what was paid above the fee", async () => {
    await memberPayingAbove(MEMBERSHIP_FEE + 1000);

    const board = await supporters();

    expect(board.count).toBe(1);
    expect(board.rows[0].name).toBe("محمد ولد أحمد");
  });

  it("says on the supporters list that the money came from a membership", async () => {
    await memberPayingAbove(MEMBERSHIP_FEE + 1000);

    const board = await supporters();

    expect(board.rows[0].sources).toEqual(["MEMBERSHIP"]);
  });

  it("says both when the same person also gave support", async () => {
    const m = await memberPayingAbove(MEMBERSHIP_FEE + 1000);
    const donation = await prisma.donation.create({
      data: { amount: 500, status: "ACTIVE", source: "SELF", userId: m.userId },
    });
    await prisma.payment.create({
      data: {
        id: donation.id,
        purpose: "DONATION",
        amount: 500,
        status: "ACTIVE",
        userId: m.userId,
      },
    });

    const board = await supporters();

    expect(board.rows[0].sources?.slice().sort()).toEqual(["DONATION", "MEMBERSHIP"]);
  });
});
