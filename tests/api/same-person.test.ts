import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/members/[id]/same-person/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, createUser, signInAsAdmin } from "./helpers";
import { clearCookies } from "./cookieJar";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function member(
  fullName: string,
  over: {
    phone?: string | null;
    accountPhone?: string;
    status?: "PENDING" | "ACTIVE" | "REJECTED";
  } = {},
) {
  const user = over.accountPhone ? await createUser(over.accountPhone) : null;
  return prisma.member.create({
    data: {
      userId: user?.id ?? null,
      fullName,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: over.status ?? "PENDING",
    },
  });
}

async function others(id: string) {
  const res = await GET(get(`/api/admin/members/${id}/same-person`), params(id));
  expect(res.status).toBe(200);
  return (await res.json()).others as { fullName: string; accountPhone: string }[];
}

describe("GET /api/admin/members/[id]/same-person", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses a caller who is not an admin", async () => {
    const m = await member("محمد");
    clearCookies();

    const res = await GET(get(`/api/admin/members/${m.id}/same-person`), params(m.id));

    expect(res.status).toBe(401);
  });

  it("finds the same person on a second account, spelled differently", async () => {
    await member("أحمد ولد سالم", { accountPhone: "22334455", status: "ACTIVE" });
    const second = await member("احمد سالم", { accountPhone: "33445566" });

    const found = await others(second.id);

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ fullName: "أحمد ولد سالم" });
  });

  it("says nothing about two names that only look alike", async () => {
    await member("سيدي محمد", { accountPhone: "22334455", status: "ACTIVE" });
    const second = await member("سيد محمد", { accountPhone: "33445566" });

    expect(await others(second.id)).toEqual([]);
  });

  it("says nothing about two brothers", async () => {
    await member("الشيخ التجاني عارف", { accountPhone: "22334455", status: "ACTIVE" });
    const brother = await member("يسلم عارف", { accountPhone: "33445566" });

    expect(await others(brother.id)).toEqual([]);
  });

  it("says nothing when nobody matches", async () => {
    await member("محمد الأمين", { accountPhone: "22334455" });
    const alone = await member("فاطمة بنت أحمد", { accountPhone: "33445566" });

    expect(await others(alone.id)).toEqual([]);
  });

  it("does not report a member against itself", async () => {
    const only = await member("محمد الأمين", { accountPhone: "22334455" });

    expect(await others(only.id)).toEqual([]);
  });

  it("reports the other membership's account, so the admin knows which number to call", async () => {
    await member("مراد وجاه", { accountPhone: "43262978", status: "ACTIVE" });
    const second = await member("مراد ولد وجاه", { accountPhone: "22119988" });

    const found = await others(second.id);

    expect(found[0].accountPhone).toBe("43262978");
  });
});
