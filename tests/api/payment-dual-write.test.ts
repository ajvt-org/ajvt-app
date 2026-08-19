import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { reconcilePayments } from "@/lib/paymentReconcile";
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
import { POST as ADMIN_ADD } from "@/app/api/admin/members/route";
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

async function bothShapesAgree() {
  const r = await reconcilePayments();
  if (!r.agrees) console.log("mismatches", r.mismatches);
  return r;
}

describe("every path that touches money writes both shapes", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
  });

  it("agrees after a member joins", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));

    expect((await bothShapesAgree()).agrees).toBe(true);
  });

  it("agrees after an admin approves that member", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.member.findFirstOrThrow();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: m.id, action: "ACTIVE" }));

    expect((await bothShapesAgree()).agrees).toBe(true);
    const payment = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(payment.amount).toBe(2100);
    expect(payment.status).toBe("ACTIVE");
  });

  it("keeps the admin who recorded the year on the payment as well", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.member.findFirstOrThrow();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await VALIDATE(post("/api/admin/validate", { id: m.id, action: "ACTIVE" }));

    const membership = await prisma.membership.findFirstOrThrow({ where: { memberId: m.id } });
    const payment = await prisma.payment.findFirstOrThrow({ where: { memberId: m.id } });
    expect(payment.recordedBy).toBe(membership.recordedBy);
    expect(payment.recordedBy).toBe("boss");
  });

  it("leaves the first admin on the year when a second one edits it", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.member.findFirstOrThrow();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
    await VALIDATE(post("/api/admin/validate", { id: m.id, action: "ACTIVE" }));

    await signInAsAdmin(await createAdmin("second", "SUPER"));
    await PAY(
      put(`/api/admin/members/${m.id}/payment`, {
        amountTransferred: 3000,
        paymentMethod: "بنكيلي",
      }),
      withId(m.id),
    );

    expect((await prisma.payment.findFirstOrThrow({ where: { memberId: m.id } })).recordedBy).toBe(
      "boss",
    );
  });

  it("agrees after an admin refuses that member", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.member.findFirstOrThrow();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(
      post("/api/admin/validate", {
        id: m.id,
        action: "REJECTED",
        rejectionReason: "الصورة غير واضحة",
      }),
    );

    expect((await bothShapesAgree()).agrees).toBe(true);
    expect((await prisma.payment.findFirstOrThrow()).status).toBe("REJECTED");
  });

  it("agrees after an admin corrects the amount", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.member.findFirstOrThrow();
    await signInAsAdmin(await createAdmin());

    await PAY(put(`/api/admin/members/${m.id}/payment`, { amountTransferred: 600 }), withId(m.id));

    expect((await bothShapesAgree()).agrees).toBe(true);
    expect((await prisma.payment.findFirstOrThrow()).amount).toBe(600);
  });

  it("agrees after an admin clears the amount", async () => {
    await signInAs(await createUser());
    await REGISTER(post("/api/members", submission));
    const m = await prisma.member.findFirstOrThrow();
    await signInAsAdmin(await createAdmin());

    await PAY(put(`/api/admin/members/${m.id}/payment`, { amountTransferred: null }), withId(m.id));

    expect((await bothShapesAgree()).agrees).toBe(true);
    expect(await prisma.payment.count()).toBe(0);
  });

  it("agrees after an admin adds a member by hand", async () => {
    await signInAsAdmin(await createAdmin());

    await ADMIN_ADD(
      post("/api/admin/members", {
        fullName: "أحمد ولد سالم",
        age: "البدريين",
        paymentMethod: "نقداً",
        phoneUnknown: true,
        status: "ACTIVE",
        paidAmount: 900,
      }),
    );

    expect((await bothShapesAgree()).agrees).toBe(true);
  });

  it("agrees after a renewal, keeping each year its own payment", async () => {
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
    const m = await prisma.member.create({
      data: {
        fullName: "محمد",
        age: "البدريين",
        paymentMethod: "بنكيلي",
        status: "ACTIVE",
        paidAmount: 100,
        membershipYear: YEAR - 1,
        memberNumber: "AJVT-2025-0001",
      },
    });
    await prisma.membership.create({
      data: { memberId: m.id, year: YEAR - 1, paidAmount: 100 },
    });
    await prisma.payment.create({
      data: {
        purpose: "MEMBERSHIP",
        memberId: m.id,
        year: YEAR - 1,
        amount: 100,
        feeApplied: 100,
        status: "ACTIVE",
      },
    });

    await RENEW(
      post(`/api/admin/members/${m.id}/renew`, { paidAmount: 1000, paymentMethod: "بنكيلي" }),
      withId(m.id),
    );

    expect((await bothShapesAgree()).agrees).toBe(true);
    expect(await prisma.payment.count({ where: { purpose: "MEMBERSHIP" } })).toBe(2);
  });

  it("agrees after a donation from someone with no account", async () => {
    await DONATE(donateForm({ amount: "5000", paymentMethod: "بنكيلي", anonymous: "true" }));

    expect((await bothShapesAgree()).agrees).toBe(true);
    const p = await prisma.payment.findFirstOrThrow({ where: { purpose: "DONATION" } });
    expect(p.amount).toBe(5000);
    expect(p.anonymous).toBe(true);
    expect(p.status).toBe("PENDING");
  });

  it("agrees after an admin records a donation by hand", async () => {
    await signInAsAdmin(await createAdmin());

    await ADMIN_DONATION(post("/api/admin/donations", { donorName: "أحمد", amount: 3000 }));

    expect((await bothShapesAgree()).agrees).toBe(true);
  });

  it("agrees after an admin edits a donation", async () => {
    await signInAsAdmin(await createAdmin());
    await ADMIN_DONATION(post("/api/admin/donations", { donorName: "أحمد", amount: 3000 }));
    const d = await prisma.donation.findFirstOrThrow();

    await EDIT_DONATION(patch(`/api/admin/donations/${d.id}`, { amount: 4000 }), withId(d.id));

    expect((await bothShapesAgree()).agrees).toBe(true);
    expect((await prisma.payment.findFirstOrThrow({ where: { id: d.id } })).amount).toBe(4000);
  });
});
