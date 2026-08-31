import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as PROFILE } from "@/app/api/admin/members/[id]/profile/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { POST as ADD_MEMBERSHIP } from "@/app/api/admin/people/[id]/membership/route";
import { POST as ADD_PERSON } from "@/app/api/admin/people/route";
import { resetDb, get, post, createAdmin, signInAsAdmin, makeMember, withId } from "./helpers";

const history = async (userId: string) =>
  (await (await PROFILE(get(`/api/admin/members/${userId}/profile`), withId(userId))).json())
    .history;

describe("the trail a member's page reads", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("carries what an approval wrote", async () => {
    const member = await makeMember({
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "PENDING",
    });

    await VALIDATE(post("/api/admin/validate", { id: member.userId, action: "ACTIVE" }));

    expect((await history(member.userId)).map((h: { action: string }) => h.action)).toContain(
      "APPROVE_MEMBER",
    );
  });

  it("carries what adding a membership by hand wrote", async () => {
    await ADD_PERSON(
      post("/api/admin/people", {
        phoneUnknown: true,
        fullName: "أحمد ولد سالم",
        age: "البدريين",
        village: "التاكلالت",
      }),
    );
    const person = await prisma.user.findFirstOrThrow({ where: { fullName: "أحمد ولد سالم" } });

    await ADD_MEMBERSHIP(
      post(`/api/admin/people/${person.id}/membership`, {
        paymentMethod: "بنكيلي",
        paidAmount: 100,
        status: "ACTIVE",
      }),
      withId(person.id),
    );

    expect((await history(person.id)).map((h: { action: string }) => h.action)).toContain(
      "ADD_MEMBERSHIP",
    );
  });
});
