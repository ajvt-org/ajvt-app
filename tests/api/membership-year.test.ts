import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { resetDb, post, createUser, createAdmin, signInAs, signInAsAdmin } from "./helpers";

import { POST as REGISTER } from "@/app/api/members/route";
import { POST as ADMIN_ADD } from "@/app/api/admin/members/route";

const submission = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  paymentProof: "proof.webp",
  paidAmount: 1000,
};

describe("the year a membership covers", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("comes from the settings when someone registers", async () => {
    const pinned = runningYear() + 1;
    await saveAppSettings({ membershipYear: pinned });
    await signInAs(await createUser());

    await REGISTER(post("/api/members", submission));

    expect((await prisma.member.findFirstOrThrow()).membershipYear).toBe(pinned);
  });

  it("comes from the settings when an admin adds a member by hand", async () => {
    const pinned = runningYear() + 1;
    await saveAppSettings({ membershipYear: pinned });
    await signInAsAdmin(await createAdmin());

    const res = await ADMIN_ADD(
      post("/api/admin/members", {
        fullName: "أحمد ولد سالم",
        age: "البدريين",
        paymentMethod: "بنكيلي",
        phoneUnknown: true,
        status: "ACTIVE",
      }),
    );

    expect(res.status).toBe(201);
    expect((await prisma.member.findFirstOrThrow()).membershipYear).toBe(pinned);
  });

  it("falls back to the running year when the association has pinned nothing", async () => {
    await signInAs(await createUser());

    await REGISTER(post("/api/members", submission));

    expect((await prisma.member.findFirstOrThrow()).membershipYear).toBe(runningYear());
  });

  it("is never missing, even on a row written without one", async () => {
    const member = await prisma.member.create({
      data: { fullName: "سالم", age: "البدريين", paymentMethod: "بنكيلي" },
    });

    expect(member.membershipYear).toBe(runningYear());
  });
});
