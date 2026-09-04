import { describe, it, expect, beforeEach } from "vitest";
import { POST as REGISTER } from "@/app/api/members/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUser, signInAs } from "./helpers";

const PAYABLE = "بنكيلي";
const ADMIN_ONLY = "نقداً";
const INVENTED = "طريقة لا وجود لها";

const submission = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentProof: "proof.webp",
  paidAmount: 2100,
};

async function submitWith(paymentMethod: string) {
  return REGISTER(post("/api/members", { ...submission, paymentMethod }));
}

describe("the method a member may submit", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAs(await createUser());
  });

  it("takes one the member is offered", async () => {
    expect((await submitWith(PAYABLE)).status).toBe(201);
    expect(await prisma.membership.count()).toBe(1);
  });

  it("refuses the method reserved for the admin", async () => {
    expect((await submitWith(ADMIN_ONLY)).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("refuses a method an admin stopped", async () => {
    await prisma.paymentMethod.update({ where: { name: PAYABLE }, data: { active: false } });
    expect((await submitWith(PAYABLE)).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("refuses a method with no account to receive into", async () => {
    await prisma.paymentAccount.deleteMany();
    expect((await submitWith(PAYABLE)).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("refuses a name nobody ever offered", async () => {
    expect((await submitWith(INVENTED)).status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("leaves nothing behind in the unified table when it refuses", async () => {
    await submitWith(ADMIN_ONLY);
    expect(await prisma.payment.count()).toBe(0);
  });
});
