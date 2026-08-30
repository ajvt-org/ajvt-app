import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as ME } from "@/app/api/user/me/route";
import { resetDb, get, makeMember, createUser, signInAs } from "./helpers";
import { runningYear } from "@/lib/membershipYear";

const YEAR = runningYear();

async function member(over: Record<string, unknown> = {}) {
  const user = await createUser(`2${String(Math.random()).slice(2, 9)}`);
  await makeMember({
    userId: user.id,
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    paymentProof: "proof.webp",
    status: "ACTIVE",
    membershipYear: YEAR,
    ...over,
  });
  const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  await signInAs(account);
  return account;
}

const mine = async () => (await (await ME(get("/api/user/me"))).json()).members[0];

describe("what a member reads about their own membership", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is the year record, down to how they paid", async () => {
    await member();

    expect(await mine()).toMatchObject({
      status: "ACTIVE",
      membershipYear: YEAR,
      paymentMethod: "بنكيلي",
      paymentProof: "proof.webp",
    });
  });

  it("is the newest year once they have renewed", async () => {
    const account = await member({ membershipYear: YEAR - 1, status: "REJECTED" });
    await prisma.membership.create({
      data: { userId: account.id, year: YEAR, status: "ACTIVE", paymentMethod: "مصرفي" },
    });

    expect(await mine()).toMatchObject({
      status: "ACTIVE",
      membershipYear: YEAR,
      paymentMethod: "مصرفي",
    });
  });

  it("carries the reason a refused year was refused", async () => {
    const account = await member({ status: "REJECTED" });
    await prisma.membership.updateMany({
      where: { userId: account.id },
      data: { rejectionReason: "proof_unreadable" },
    });

    expect(await mine()).toMatchObject({
      status: "REJECTED",
      rejectionReason: "proof_unreadable",
    });
  });

  it("names the account, which is what the screens ask about by id", async () => {
    const account = await member();

    expect((await mine()).id).toBe(account.id);
  });

  it("is empty for an account that never joined", async () => {
    const user = await createUser("22009911");
    await signInAs(user);

    const body = await (await ME(get("/api/user/me"))).json();

    expect(body.members).toEqual([]);
  });
});
