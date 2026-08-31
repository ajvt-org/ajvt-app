import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/people/[id]/membership/route";
import { POST as ADD_PERSON } from "@/app/api/admin/people/route";
import { prisma } from "@/lib/prisma";
import { issueMembership } from "@/lib/member";
import { resetDb, post, createAdmin, signInAsAdmin, withId } from "./helpers";

async function counterValue(): Promise<number> {
  const counter = await prisma.counter.findUnique({ where: { id: "memberNumber" } });
  return counter?.value ?? 0;
}

async function person() {
  await ADD_PERSON(
    post("/api/admin/people", {
      accountPhone: "36000123",
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      village: "التاكلالت",
    }),
  );
  return prisma.user.findFirstOrThrow({ where: { fullName: "محمد ولد أحمد" } });
}

describe("membership number counter", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
  });

  it("keeps the counter where it was when the transaction rolls back", async () => {
    const before = await counterValue();

    await expect(
      prisma.$transaction(async (tx) => {
        await issueMembership(tx);
        throw new Error("rolled back");
      }),
    ).rejects.toThrow("rolled back");

    expect(await counterValue()).toBe(before);
  });

  it("moves the counter once for a membership that goes through", async () => {
    const target = await person();
    const before = await counterValue();

    const response = await POST(
      post(`/api/admin/people/${target.id}/membership`, {
        paymentMethod: "بنكيلي",
        paidAmount: 100,
        status: "ACTIVE",
      }),
      withId(target.id),
    );

    expect(response.status).toBe(201);
    expect(await counterValue()).toBe(before + 1);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).memberNumber,
    ).toMatch(/^AJVT-\d{4}-\d{4}$/);
  });

  it("does not take a number for a membership left pending", async () => {
    const target = await person();
    const before = await counterValue();

    await POST(
      post(`/api/admin/people/${target.id}/membership`, {
        paymentMethod: "بنكيلي",
        paidAmount: 100,
        status: "PENDING",
      }),
      withId(target.id),
    );

    expect(await counterValue()).toBe(before);
  });
});
