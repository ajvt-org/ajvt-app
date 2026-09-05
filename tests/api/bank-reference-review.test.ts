import { describe, it, expect, beforeEach } from "vitest";
import { PATCH } from "@/app/api/admin/donations/[id]/route";
import { GET as proofsRoute } from "@/app/api/admin/payment-proofs/route";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, get, withId, createAdmin, signInAsAdmin } from "./helpers";

const METHOD = "بنكيلي";
const REFERENCE = "TR10000000001";

async function aDonation(over: Record<string, unknown> = {}) {
  return prisma.donation.create({
    data: { amount: 5000, status: "ACTIVE", source: "PUBLIC", paymentMethod: METHOD, ...over },
  });
}

function editing(id: string, body: unknown) {
  return [patch(`/api/admin/donations/${id}`, body), withId(id)] as const;
}

describe("the bank's transaction number at review", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("is saved and comes back", async () => {
    const donation = await aDonation();

    const res = await PATCH(...editing(donation.id, { bankReference: REFERENCE }));

    expect(res.status).toBe(200);
    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).bankReference,
    ).toBe(REFERENCE);
  });

  it("reaches the unified table through the mirror", async () => {
    const donation = await aDonation();
    await PATCH(...editing(donation.id, { bankReference: REFERENCE }));

    expect(
      (await prisma.payment.findUniqueOrThrow({ where: { id: donation.id } })).bankReference,
    ).toBe(REFERENCE);
  });

  it("drops the spaces an admin typed it with", async () => {
    const donation = await aDonation();
    await PATCH(...editing(donation.id, { bankReference: "TR 100 000 000 01" }));

    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).bankReference,
    ).toBe(REFERENCE);
  });

  it("is taken back off when it is cleared", async () => {
    const donation = await aDonation({ bankReference: REFERENCE });
    await PATCH(...editing(donation.id, { bankReference: null }));

    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).bankReference,
    ).toBeNull();
  });

  it("refuses one longer than a reference could be", async () => {
    const donation = await aDonation();
    expect((await PATCH(...editing(donation.id, { bankReference: "1".repeat(60) }))).status).toBe(
      400,
    );
  });
});

describe("the same transfer submitted twice", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function proofs() {
    const res = await proofsRoute(get("/api/admin/payment-proofs"));
    return (await res.json()).proofs as {
      id: string;
      bankReference?: string | null;
      repeatedReference?: boolean;
    }[];
  }

  it("is not flagged when a number appears once", async () => {
    const donation = await aDonation();
    await PATCH(...editing(donation.id, { bankReference: REFERENCE }));

    const row = (await proofs()).find((p) => p.id === donation.id);
    expect(row?.repeatedReference).toBe(false);
  });

  it("is flagged on both records when a number appears twice", async () => {
    const first = await aDonation();
    const second = await aDonation();
    await PATCH(...editing(first.id, { bankReference: REFERENCE }));
    await PATCH(...editing(second.id, { bankReference: REFERENCE }));

    const rows = await proofs();
    expect(rows.find((p) => p.id === first.id)?.repeatedReference).toBe(true);
    expect(rows.find((p) => p.id === second.id)?.repeatedReference).toBe(true);
  });

  it("is saved anyway, since a repeat may be a correction", async () => {
    const first = await aDonation();
    const second = await aDonation();
    await PATCH(...editing(first.id, { bankReference: REFERENCE }));

    const res = await PATCH(...editing(second.id, { bankReference: REFERENCE }));

    expect(res.status).toBe(200);
    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: second.id } })).bankReference,
    ).toBe(REFERENCE);
  });

  it("does not flag the rows that carry no number at all", async () => {
    await aDonation();
    await aDonation();

    expect((await proofs()).every((p) => p.repeatedReference === false)).toBe(true);
  });
});
