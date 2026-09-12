import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import {
  resetDb,
  post,
  put,
  patch,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withId,
  postForm,
  makeMember,
  adminAddsMember,
} from "./helpers";

vi.mock("@/lib/imageProcessing", async (orig) => {
  const actual = await orig<typeof import("@/lib/imageProcessing")>();
  return {
    ...actual,
    processImage: async () => ({ full: Buffer.from("f"), thumbnail: Buffer.from("t") }),
  };
});

import { POST as REGISTER } from "@/app/api/members/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { PUT as PAY } from "@/app/api/admin/members/[id]/payment/route";
import { POST as RENEW } from "@/app/api/admin/members/[id]/renew/route";
import { POST as DONATE } from "@/app/api/donations/route";
import { POST as ADMIN_DONATION } from "@/app/api/admin/donations/route";
import { PATCH as EDIT_DONATION } from "@/app/api/admin/donations/[id]/route";

const YEAR = runningYear();

const submission = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  paymentProof: "proof.webp",
  paidAmount: 2100,
};

let ip = 0;
function donateForm(fields: Record<string, string>) {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }));
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return postForm("/api/donations", fd, { "x-forwarded-for": `10.1.0.${++ip}` });
}

async function moneyKeptAnywhereElse() {
  return prisma.donation.count({ where: { source: "MEMBERSHIP" } });
}

const CARRIED = [
  "method",
  "accountId",
  "bankReference",
  "proof",
  "referenceCode",
  "recordedBy",
  "reviewedBy",
  "reviewedAt",
] as const;

async function columnsMissingFromThePayment() {
  const memberships = await prisma.membership.findMany();
  const missing: string[] = [];
  for (const membership of memberships) {
    const payment = await prisma.payment.findFirst({
      where: { userId: membership.userId, year: membership.year, purpose: "MEMBERSHIP" },
    });
    if (!payment) continue;
    for (const column of CARRIED) {
      if (!(column in payment)) missing.push(column);
    }
  }
  return missing;
}

describe("every path that touches money writes only the payment", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
  });

  it("agrees after a member joins", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));

    expect(await moneyKeptAnywhereElse()).toBe(0);
  });

  it("agrees after an admin approves that member", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.membership.findFirstOrThrow();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: m.userId, action: "ACTIVE" }));

    expect(await moneyKeptAnywhereElse()).toBe(0);
    const payment = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(payment.amount).toBe(2100);
    expect(payment.status).toBe("ACTIVE");
  });

  it("names the member who sent it as the recorder and the admin as the reviewer", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.membership.findFirstOrThrow();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await VALIDATE(post("/api/admin/validate", { id: m.userId, action: "ACTIVE" }));

    const payment = await prisma.payment.findFirstOrThrow({ where: { userId: m.userId } });
    expect(payment.recordedBy).toBe("محمد ولد أحمد");
    expect(payment.reviewedBy).toBe("boss");
  });

  it("leaves the first recorder on the payment when an admin edits it", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.membership.findFirstOrThrow();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
    await VALIDATE(post("/api/admin/validate", { id: m.userId, action: "ACTIVE" }));

    await signInAsAdmin(await createAdmin("second", "SUPER"));
    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, {
        amountTransferred: 3000,
        paymentMethod: "بنكيلي",
      }),
      withId(m.userId),
    );

    expect(
      (await prisma.payment.findFirstOrThrow({ where: { userId: m.userId } })).recordedBy,
    ).toBe("محمد ولد أحمد");
  });

  it("carries all eight columns after a member joins", async () => {
    await signInAs(await createUser());

    await REGISTER(post("/api/members", { ...submission, referenceCode: "AJ-2345B" }));

    const payment = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(payment.referenceCode).toBe("AJ-2345B");
    expect(await columnsMissingFromThePayment()).toEqual([]);
  });

  it("carries all eight after an admin approves the member", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", { ...submission, referenceCode: "AJ-2345B" }));
    const m = await prisma.membership.findFirstOrThrow();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await VALIDATE(post("/api/admin/validate", { id: m.userId, action: "ACTIVE" }));

    const payment = await prisma.payment.findFirstOrThrow({ where: { userId: m.userId } });
    expect(payment.reviewedBy).toBe("boss");
    expect(payment.reviewedAt).not.toBeNull();
    expect(await columnsMissingFromThePayment()).toEqual([]);
  });

  it("carries all eight after an admin refuses the member", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", { ...submission, referenceCode: "AJ-2345B" }));
    const m = await prisma.membership.findFirstOrThrow();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await VALIDATE(
      post("/api/admin/validate", {
        id: m.userId,
        action: "REJECTED",
        rejectionReason: "الصورة غير واضحة",
      }),
    );

    const payment = await prisma.payment.findFirstOrThrow({ where: { userId: m.userId } });
    expect(payment.reviewedBy).toBe("boss");
    expect(await columnsMissingFromThePayment()).toEqual([]);
  });

  it("agrees after an admin refuses that member", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.membership.findFirstOrThrow();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(
      post("/api/admin/validate", {
        id: m.userId,
        action: "REJECTED",
        rejectionReason: "الصورة غير واضحة",
      }),
    );

    expect(await moneyKeptAnywhereElse()).toBe(0);
    expect((await prisma.payment.findFirstOrThrow()).status).toBe("REJECTED");
  });

  it("agrees after an admin corrects the amount", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.membership.findFirstOrThrow();
    await signInAsAdmin(await createAdmin());

    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 600 }),
      withId(m.userId),
    );

    expect(await moneyKeptAnywhereElse()).toBe(0);
    expect((await prisma.payment.findFirstOrThrow()).amount).toBe(600);
  });

  it("agrees after an admin is refused an amount sent as nothing", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.membership.findFirstOrThrow();
    await signInAsAdmin(await createAdmin());

    const res = await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: null }),
      withId(m.userId),
    );

    expect(res.status).toBe(400);
    expect(await moneyKeptAnywhereElse()).toBe(0);
    expect(await prisma.payment.count()).toBe(1);
  });

  it("agrees after an admin adds a member by hand", async () => {
    await signInAsAdmin(await createAdmin());

    await adminAddsMember({
      fullName: "أحمد ولد سالم",
      age: "البدريين",
      paymentMethod: "نقداً",
      phoneUnknown: true,
      status: "ACTIVE",
      paidAmount: 900,
    });

    expect(await moneyKeptAnywhereElse()).toBe(0);
  });

  it("agrees after a renewal, keeping each year its own payment", async () => {
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
    const m = await makeMember({
      fullName: "محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 100,
      membershipYear: YEAR - 1,
      memberNumber: "AJVT-2025-0001",
    });

    await RENEW(
      post(`/api/admin/members/${m.userId}/renew`, { paidAmount: 1000, paymentMethod: "بنكيلي" }),
      withId(m.userId),
    );

    expect(await moneyKeptAnywhereElse()).toBe(0);
    expect(await prisma.payment.count({ where: { purpose: "MEMBERSHIP" } })).toBe(2);
  });

  it("agrees after a donation from someone with no account", async () => {
    await DONATE(donateForm({ amount: "5000", paymentMethod: "بنكيلي", anonymous: "true" }));

    expect(await moneyKeptAnywhereElse()).toBe(0);
    const p = await prisma.payment.findFirstOrThrow({ where: { purpose: "DONATION" } });
    expect(p.amount).toBe(5000);
    expect(p.anonymous).toBe(true);
    expect(p.status).toBe("PENDING");
  });

  it("agrees after an admin records a donation by hand", async () => {
    await signInAsAdmin(await createAdmin());

    await ADMIN_DONATION(post("/api/admin/donations", { donorName: "أحمد", amount: 3000 }));

    expect(await moneyKeptAnywhereElse()).toBe(0);
  });

  it("agrees after an admin edits a donation", async () => {
    await signInAsAdmin(await createAdmin());
    await ADMIN_DONATION(post("/api/admin/donations", { donorName: "أحمد", amount: 3000 }));
    const gift = await prisma.payment.findFirstOrThrow({ where: { purpose: "DONATION" } });

    await EDIT_DONATION(
      patch(`/api/admin/donations/${gift.id}`, { amount: 4000 }),
      withId(gift.id),
    );

    expect(await moneyKeptAnywhereElse()).toBe(0);
    expect((await prisma.payment.findFirstOrThrow({ where: { id: gift.id } })).amount).toBe(4000);
  });
});
