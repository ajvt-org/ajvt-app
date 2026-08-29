import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/members/route";
import { prisma } from "@/lib/prisma";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { resetDb, post, createUser, signInAs, personFor } from "./helpers";

const validBody = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  paymentProof: "proof.webp",
  paidAmount: 1000,
};

async function signedIn(phone = "22334455") {
  const user = await createUser(phone);
  await signInAs(user);
  return user;
}

describe("the village on a membership request", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.village.create({ data: { name: HOME_VILLAGE } });
    await prisma.village.create({ data: { name: "أفجار" } });
  });

  it("files a request under the home village when none is sent", async () => {
    await signedIn();

    const res = await POST(post("/api/members", validBody));

    expect(res.status).toBe(201);
    const member = await personFor((await prisma.member.findFirstOrThrow()).id);
    expect(member.village).toBe(HOME_VILLAGE);
    expect(member.age).toBe("البدريين");
  });

  it("keeps the age group for the home village", async () => {
    await signedIn();

    await POST(post("/api/members", { ...validBody, village: HOME_VILLAGE }));

    expect((await personFor((await prisma.member.findFirstOrThrow()).id)).age).toBe("البدريين");
  });

  it("refuses the home village with no age group", async () => {
    await signedIn();

    const res = await POST(post("/api/members", { ...validBody, village: HOME_VILLAGE, age: "" }));

    expect(res.status).toBe(400);
    expect(await prisma.member.count()).toBe(0);
  });

  it("takes a neighbouring village and drops the age group with it", async () => {
    await signedIn();

    const res = await POST(post("/api/members", { ...validBody, village: "أفجار" }));

    expect(res.status).toBe(201);
    const member = await personFor((await prisma.member.findFirstOrThrow()).id);
    expect(member.village).toBe("أفجار");
    expect(member.age).toBeNull();
  });

  it("takes a neighbouring village with no age group at all", async () => {
    await signedIn();

    const res = await POST(post("/api/members", { ...validBody, village: "أفجار", age: null }));

    expect(res.status).toBe(201);
    expect((await personFor((await prisma.member.findFirstOrThrow()).id)).age).toBeNull();
  });

  it("takes the other option for a village nobody listed", async () => {
    await signedIn();

    const res = await POST(post("/api/members", { ...validBody, village: OTHER_VILLAGE, age: "" }));

    expect(res.status).toBe(201);
    const member = await personFor((await prisma.member.findFirstOrThrow()).id);
    expect(member.village).toBe(OTHER_VILLAGE);
    expect(member.age).toBeNull();
  });

  it("refuses a village that is not on the managed list", async () => {
    await signedIn();

    const res = await POST(post("/api/members", { ...validBody, village: "بوتلميت" }));

    expect(res.status).toBe(400);
    expect(await prisma.member.count()).toBe(0);
  });

  it("trims the village before storing it", async () => {
    await signedIn();

    await POST(post("/api/members", { ...validBody, village: " أفجار " }));

    expect((await personFor((await prisma.member.findFirstOrThrow()).id)).village).toBe("أفجار");
  });

  it("moves a member to a neighbouring village when they correct their request", async () => {
    const user = await signedIn();
    await POST(post("/api/members", validBody));
    const created = await prisma.member.findFirstOrThrow();
    expect(created.userId).toBe(user.id);

    const res = await POST(
      post("/api/members", { ...validBody, id: created.id, village: "أفجار" }),
    );

    expect(res.status).toBe(200);
    const member = await personFor(created.id);
    expect(member.village).toBe("أفجار");
    expect(member.age).toBeNull();
  });

  it("gives a member back their age group when they correct it to the home village", async () => {
    await signedIn();
    await POST(post("/api/members", { ...validBody, village: "أفجار" }));
    const created = await prisma.member.findFirstOrThrow();

    const res = await POST(
      post("/api/members", {
        ...validBody,
        id: created.id,
        village: HOME_VILLAGE,
        age: "المجاهدين",
      }),
    );

    expect(res.status).toBe(200);
    const member = await personFor(created.id);
    expect(member.village).toBe(HOME_VILLAGE);
    expect(member.age).toBe("المجاهدين");
  });
});
