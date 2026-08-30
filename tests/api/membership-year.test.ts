import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import {
  resetDb,
  post,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  makeMember,
  adminAddsMember,
} from "./helpers";

import { POST as REGISTER } from "@/app/api/members/route";

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

    expect((await prisma.membership.findFirstOrThrow()).year).toBe(pinned);
  });

  it("comes from the settings when an admin adds a member by hand", async () => {
    const pinned = runningYear() + 1;
    await saveAppSettings({ membershipYear: pinned });
    await signInAsAdmin(await createAdmin());

    const res = await adminAddsMember({
      fullName: "أحمد ولد سالم",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      phoneUnknown: true,
      status: "ACTIVE",
    });

    expect(res.status).toBe(201);
    expect((await prisma.membership.findFirstOrThrow()).year).toBe(pinned);
  });

  it("falls back to the running year when the association has pinned nothing", async () => {
    await signInAs(await createUser());

    await REGISTER(post("/api/members", submission));

    expect((await prisma.membership.findFirstOrThrow()).year).toBe(runningYear());
  });

  it("is never missing, even on a membership written without one", async () => {
    await makeMember({ fullName: "سالم", age: "البدريين", paymentMethod: "بنكيلي" });

    expect((await prisma.membership.findFirstOrThrow()).year).toBe(runningYear());
  });
});
