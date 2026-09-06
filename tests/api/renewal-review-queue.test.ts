import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import {
  resetDb,
  get,
  post,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  makeMember,
} from "./helpers";

import { POST as RENEW_SELF } from "@/app/api/members/renew/route";
import { GET as MEMBER_LIST } from "@/app/api/admin/members/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { POST as SUBMIT } from "@/app/api/members/route";

const YEAR = runningYear();
const LAST = YEAR - 1;
const FEE = 100;
const NUMBER = "AJVT-2025-0001";

interface QueuedMember {
  id: string;
  status: string;
  membershipYear: number;
  paidAmount: number | null;
  paymentProof: string | null;
}

async function memberRenews() {
  const user = await createUser();
  await makeMember({
    userId: user.id,
    status: "ACTIVE",
    membershipYear: LAST,
    paymentMethod: "بنكيلي",
    paidAmount: FEE,
    memberNumber: NUMBER,
  });
  await signInAs(user);
  await RENEW_SELF(
    post("/api/members/renew", {
      paymentMethod: "بنكيلي",
      paidAmount: FEE,
      paymentProof: "renewal.jpg",
    }),
  );
  return user;
}

async function queue(): Promise<QueuedMember[]> {
  const res = await MEMBER_LIST(get("/api/admin/members"));
  return (await res.json()).members;
}

const decide = (id: string, action: string, rejectionReason?: string) =>
  VALIDATE(post("/api/admin/validate", { id, action, rejectionReason }));

const yearRow = (userId: string, year: number) =>
  prisma.membership.findFirstOrThrow({ where: { userId, year } });

describe("a member's own renewal in the review queue", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: FEE });
  });

  it("stands in the queue beside a first membership", async () => {
    const renewing = await memberRenews();
    const joining = await makeMember({ status: "PENDING", membershipYear: YEAR });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    const waiting = (await queue()).filter((m) => m.status === "PENDING");

    expect(waiting.map((m) => m.id).sort()).toEqual([renewing.id, joining.userId].sort());
  });

  it("carries the renewal's own year, proof and amount into the queue", async () => {
    const user = await memberRenews();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    const row = (await queue()).find((m) => m.id === user.id);

    expect(row?.membershipYear).toBe(YEAR);
    expect(row?.paymentProof).toBe("renewal.jpg");
    expect(row?.paidAmount).toBe(FEE);
  });

  it("accepts the renewal the way it accepts a first membership", async () => {
    const user = await memberRenews();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    const res = await decide(user.id, "ACTIVE");

    expect(res.status).toBe(200);
    const row = await yearRow(user.id, YEAR);
    expect(row.status).toBe("ACTIVE");
    expect(row.reviewedBy).toBe("boss");
    expect(row.reviewedAt).not.toBeNull();
  });

  it("keeps the member as the one who recorded it after an admin accepts", async () => {
    const user = await memberRenews();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await decide(user.id, "ACTIVE");

    expect((await yearRow(user.id, YEAR)).recordedBy).toBe("محمد ولد أحمد");
  });

  it("leaves the number the member already carries", async () => {
    const user = await memberRenews();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await decide(user.id, "ACTIVE");

    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).memberNumber).toBe(
      NUMBER,
    );
  });

  it("banks the renewal money once the review passes", async () => {
    const user = await memberRenews();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await decide(user.id, "ACTIVE");

    const payment = await prisma.payment.findFirstOrThrow({
      where: { userId: user.id, purpose: "MEMBERSHIP", year: YEAR },
    });
    expect(payment.status).toBe("ACTIVE");
  });

  it("refuses the renewal without disturbing the year already paid", async () => {
    const user = await memberRenews();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    await decide(user.id, "REJECTED", REJECTION_REASONS[0]);

    expect((await yearRow(user.id, YEAR)).status).toBe("REJECTED");
    expect((await yearRow(user.id, LAST)).status).toBe("ACTIVE");
  });

  it("lets the member send the refused renewal again on the same row", async () => {
    const user = await memberRenews();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
    await decide(user.id, "REJECTED", REJECTION_REASONS[0]);

    await signInAs(user);
    const again = await SUBMIT(
      post("/api/members", {
        id: user.id,
        paymentMethod: "بنكيلي",
        paidAmount: FEE,
        paymentProof: "second.jpg",
      }),
    );

    expect(again.status).toBe(200);
    const row = await yearRow(user.id, YEAR);
    expect(row.status).toBe("PENDING");
    expect(row.paymentProof).toBe("second.jpg");
    expect(await prisma.membership.count({ where: { userId: user.id } })).toBe(2);
  });

  it("does not open a second row for a year the member is already amending", async () => {
    const user = await memberRenews();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
    await decide(user.id, "REJECTED", REJECTION_REASONS[0]);

    await signInAs(user);
    const again = await RENEW_SELF(
      post("/api/members/renew", {
        paymentMethod: "بنكيلي",
        paidAmount: FEE,
        paymentProof: "second.jpg",
      }),
    );

    expect(again.status).toBe(409);
    expect(await prisma.membership.count({ where: { userId: user.id, year: YEAR } })).toBe(1);
  });
});
