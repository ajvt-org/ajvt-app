import { describe, it, expect, beforeEach } from "vitest";
import { POST as REGISTER } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { resetDb, post } from "./helpers";

const signUp = {
  phone: "22119911",
  password: "secret12",
  fullName: "محمد ولد أحمد",
  village: HOME_VILLAGE,
  age: "البدريين",
};

describe("signing up creates the whole person", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.village.create({ data: { name: HOME_VILLAGE } });
    await prisma.village.create({ data: { name: "أفجار" } });
    await prisma.ageGroup.create({ data: { name: "البدريين", approved: true } });
  });

  it("puts the name, village and age group on the account", async () => {
    const res = await REGISTER(post("/api/auth/register", signUp));

    expect(res.status).toBe(201);
    const account = await prisma.user.findUniqueOrThrow({ where: { phone: signUp.phone } });
    expect(account.fullName).toBe("محمد ولد أحمد");
    expect(account.village).toBe(HOME_VILLAGE);
    expect(account.age).toBe("البدريين");
  });

  it("creates no membership, since signing up is not paying", async () => {
    await REGISTER(post("/api/auth/register", signUp));

    expect(await prisma.member.count()).toBe(0);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("takes a photo when one is offered", async () => {
    await REGISTER(post("/api/auth/register", { ...signUp, photo: "face.webp" }));

    expect((await prisma.user.findFirstOrThrow()).photo).toBe("face.webp");
  });

  it("drops the age group for a neighbouring village", async () => {
    const res = await REGISTER(
      post("/api/auth/register", { ...signUp, village: "أفجار", age: "البدريين" }),
    );

    expect(res.status).toBe(201);
    const account = await prisma.user.findFirstOrThrow();
    expect(account.village).toBe("أفجار");
    expect(account.age).toBeNull();
  });

  it("takes the other option with no age group", async () => {
    const res = await REGISTER(
      post("/api/auth/register", { ...signUp, village: OTHER_VILLAGE, age: null }),
    );

    expect(res.status).toBe(201);
    expect((await prisma.user.findFirstOrThrow()).village).toBe(OTHER_VILLAGE);
  });

  it("refuses the home village with no age group", async () => {
    const res = await REGISTER(post("/api/auth/register", { ...signUp, age: null }));

    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("refuses a village nobody manages", async () => {
    const res = await REGISTER(post("/api/auth/register", { ...signUp, village: "بوتلميت" }));

    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("refuses a name that is not written in arabic", async () => {
    const res = await REGISTER(post("/api/auth/register", { ...signUp, fullName: "Mohamed" }));

    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("refuses a blank name", async () => {
    const res = await REGISTER(post("/api/auth/register", { ...signUp, fullName: "  " }));

    expect(res.status).toBe(400);
  });

  it("files a request under the home village when none is sent", async () => {
    const { village: _village, ...withoutVillage } = signUp;
    void _village;

    const res = await REGISTER(post("/api/auth/register", withoutVillage));

    expect(res.status).toBe(201);
    expect((await prisma.user.findFirstOrThrow()).village).toBe(HOME_VILLAGE);
  });

  it("holds a suggested age group back until an admin approves it", async () => {
    const res = await REGISTER(post("/api/auth/register", { ...signUp, age: "الفلانيين" }));

    expect(res.status).toBe(201);
    const suggested = await prisma.ageGroup.findUnique({ where: { name: "الفلانيين" } });
    expect(suggested?.approved).toBe(false);
    expect((await prisma.user.findFirstOrThrow()).age).toBe("الفلانيين");
  });

  it("still refuses a number that already has an account", async () => {
    await REGISTER(post("/api/auth/register", signUp));

    const res = await REGISTER(post("/api/auth/register", signUp));

    expect(res.status).toBe(409);
    expect(await prisma.user.count()).toBe(1);
  });

  it("signs the new account in", async () => {
    const res = await REGISTER(post("/api/auth/register", signUp));

    expect(res.cookies.get("user_token")?.value).toBeTruthy();
  });
});
