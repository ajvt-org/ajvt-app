import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, makeMember, createUser, signInAs } from "./helpers";
import { runningYear } from "@/lib/membershipYear";

const YEAR = runningYear();

const { getViewerAge } = await import("@/lib/viewerAge");

async function member(over: Record<string, unknown> = {}) {
  const user = await createUser(`2${String(Math.random()).slice(2, 9)}`);
  await makeMember({
    userId: user.id,
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    membershipYear: YEAR,
    ...over,
  });
  return prisma.user.findUniqueOrThrow({ where: { id: user.id } });
}

describe("the age the viewer belongs to", () => {
  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  it("is the age on the account of an accepted member", async () => {
    const user = await member();
    await signInAs(user);

    expect(await getViewerAge()).toBe("البدريين");
  });

  it("is nothing for an account still waiting on review", async () => {
    const user = await member({ status: "PENDING" });
    await signInAs(user);

    expect(await getViewerAge()).toBeNull();
  });

  it("is nothing for a signed in account that never joined", async () => {
    const user = await createUser("22004411");
    await signInAs(user);

    expect(await getViewerAge()).toBeNull();
  });

  it("follows the newest year when a member has renewed", async () => {
    const user = await member({ status: "REJECTED", membershipYear: YEAR - 1 });
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "ACTIVE", paymentMethod: "بنكيلي" },
    });
    await signInAs(user);

    expect(await getViewerAge()).toBe("البدريين");
  });

  it("is nothing once the newest year was refused", async () => {
    const user = await member({ membershipYear: YEAR - 1 });
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "REJECTED", paymentMethod: "بنكيلي" },
    });
    await signInAs(user);

    expect(await getViewerAge()).toBeNull();
  });
});
