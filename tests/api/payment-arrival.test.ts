import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  patch,
  post,
  postForm,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  makeMember,
  withId,
  giveGift,
} from "./helpers";

vi.mock("@/lib/imageProcessing", async (orig) => {
  const actual = await orig<typeof import("@/lib/imageProcessing")>();
  return {
    ...actual,
    processImage: async () => ({ full: Buffer.from("f"), thumbnail: Buffer.from("t") }),
  };
});

import { POST as GIVE } from "@/app/api/donations/route";
import { POST as RECORD } from "@/app/api/admin/donations/route";
import { PATCH as UPDATE } from "@/app/api/admin/donations/[id]/route";

let seq = 0;

function give(fields: Record<string, string> = {}) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }));
  form.append("amount", "5000");
  form.append("paymentMethod", "بنكيلي");
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return GIVE(postForm("/api/donations", form, { "x-forwarded-for": `10.0.9.${++seq}` }));
}

async function aMember(phone: string, name: string) {
  const user = await createUser(phone);
  await makeMember({
    fullName: name,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    userId: user.id,
  });
  return user;
}

function gift() {
  return prisma.payment.findFirstOrThrow();
}

describe("the payment records how a gift arrived", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("marks a gift that came in with nobody signed in as public", async () => {
    await give({ anonymous: "true" });

    expect((await gift()).source).toBe("PUBLIC");
  });

  it("marks a gift from a signed-in member as coming from an account", async () => {
    const user = await aMember("22110055", "سالم ولد محمد");
    await signInAs(user);

    await give({ userId: user.id });

    expect((await gift()).source).toBe("SELF");
  });

  it("marks a gift an admin records against an account as coming from an account", async () => {
    const user = await aMember("22110066", "أحمد ولد سالم");
    await signInAsAdmin(await createAdmin());

    const res = await RECORD(post("/api/admin/donations", { userId: user.id, amount: 3000 }));
    expect(res.status).toBe(201);

    expect((await gift()).source).toBe("SELF");
  });

  it("keeps the arrival as public when an admin links an account afterwards", async () => {
    const user = await aMember("22110077", "محمد ولد أحمد");
    const before = await giveGift({ amount: 5000, anonymous: true });
    await signInAsAdmin(await createAdmin());

    await UPDATE(
      patch(`/api/admin/donations/${before.id}`, { userId: user.id }),
      withId(before.id),
    );

    const payment = await gift();
    expect(payment.userId).toBe(user.id);
    expect(payment.source).toBe("PUBLIC");
  });
});
