import { NextRequest } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { signToken } from "@/lib/auth";
import { forgetShared } from "@/lib/sharedResult";
import { forgetRateLimits } from "@/lib/rateLimit";
import { setCookie, clearCookies } from "./cookieJar";

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  await prisma.questionBank.create({ data: { id: "general", name: "البنك العام" } });
  forgetShared();
  forgetRateLimits();
  clearCookies();
}

// withRoute() rejects a mutating request that does not say where it came from,
// so every builder here says it, once, rather than 45 test files each saying it.
const ORIGIN = "http://localhost";

function sending(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(`${ORIGIN}${url}`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(body),
  });
}

export function post(url: string, body: unknown): NextRequest {
  return sending(url, "POST", body);
}

export function patch(url: string, body: unknown): NextRequest {
  return sending(url, "PATCH", body);
}

export function put(url: string, body: unknown): NextRequest {
  return sending(url, "PUT", body);
}

export function del(url: string, body?: unknown): NextRequest {
  if (body === undefined) {
    return new NextRequest(`${ORIGIN}${url}`, { method: "DELETE", headers: { origin: ORIGIN } });
  }
  return sending(url, "DELETE", body);
}

export function postForm(
  url: string,
  form: FormData,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`${ORIGIN}${url}`, {
    method: "POST",
    body: form,
    headers: { origin: ORIGIN, ...headers },
  });
}

export function get(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method: "GET", headers });
}

// An account is a person: every one made here carries a name, the way signing
// up leaves it.
export async function createUser(phone = "22334455", password = "secret") {
  return prisma.user.create({
    data: {
      phone,
      password: await bcrypt.hash(password, 4),
      fullName: "محمد ولد أحمد",
      age: "البدريين",
    },
  });
}

let phoneSeq = 0;

export async function createUsers(count: number, password = "secret") {
  const made = [];
  for (let i = 0; i < count; i++) {
    phoneSeq += 1;
    made.push(await createUser(`3${String(phoneSeq).padStart(7, "0")}`, password));
  }
  return made;
}

export async function createAdmin(username = "admin", role = "SUPER", password = "secret") {
  return prisma.admin.create({
    data: { username, password: await bcrypt.hash(password, 4), role },
  });
}

export async function signInAs(user: { id: string; tokenVersion: number }) {
  const token = await signToken({ typ: "user", userId: user.id, tokenVersion: user.tokenVersion });
  setCookie("user_token", token);
  return token;
}

export async function signInAsAdmin(admin: { id: string; username: string; tokenVersion: number }) {
  const token = await signToken({
    typ: "admin",
    adminId: admin.id,
    username: admin.username,
    tokenVersion: admin.tokenVersion,
  });
  setCookie("admin_token", token);
  return token;
}

// The second argument Next hands a route handler. Every test built its own copy
// of this, in two shapes, which is one more place for a request to be built by
// hand and miss what the helpers above put on it.
export function withParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

export function withId(id: string) {
  return withParams({ id });
}

export function personFor(memberId: string) {
  return prisma.user.findFirstOrThrow({ where: { members: { some: { id: memberId } } } });
}

const PERSON = ["fullName", "age", "village", "photo", "memberNumber", "verifyToken"] as const;

// A member and the account that carries the person, from one flat object: the
// person's own fields land on the account, the rest on the membership.
export async function makeMember(data: Record<string, unknown>) {
  const person: Record<string, unknown> = {};
  const membership: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if ((PERSON as readonly string[]).includes(key)) person[key] = value;
    else membership[key] = value;
  }

  // What was paid is a payment. The fixture records one so a member set up
  // here looks like a member the app itself made.
  const paid = membership.paidAmount as number | null | undefined;
  const anonymous = membership.surplusAnonymous === true;

  const userId = membership.userId as string | undefined;
  const member = userId
    ? await (async () => {
        if (Object.keys(person).length > 0) {
          await prisma.user.update({ where: { id: userId }, data: person });
        }
        return prisma.member.create({ data: membership as never });
      })()
    : await prisma.member.create({
        data: { ...membership, user: { create: person } } as never,
      });

  if (paid !== undefined && paid !== null) {
    const owner = await prisma.member.findUniqueOrThrow({
      where: { id: member.id },
      select: {
        userId: true,
        membershipYear: true,
        status: true,
        paymentMethod: true,
        user: { select: { fullName: true } },
      },
    });
    await prisma.payment.create({
      data: {
        purpose: "MEMBERSHIP",
        amount: paid,
        feeApplied: MEMBERSHIP_FEE,
        year: owner.membershipYear,
        status: owner.status,
        method: owner.paymentMethod,
        memberId: member.id,
        userId: owner.userId,
        anonymous,
        donorName: anonymous ? null : owner.user.fullName,
      },
    });
  }

  return member;
}

export async function adminAddsMember(body: Record<string, unknown>) {
  const { POST: ADD_PERSON } = await import("@/app/api/admin/people/route");
  const { POST: ADD_PAYMENT } = await import("@/app/api/admin/people/[id]/membership/route");

  const { paymentMethod, paymentProof, paidAmount, surplusAnonymous, status, ...person } = body;

  const created = await ADD_PERSON(post("/api/admin/people", person));
  if (created.status !== 201) return created;

  const { person: saved } = await created.json();
  if (!paymentMethod) return created;

  return ADD_PAYMENT(
    post(`/api/admin/people/${saved.id}/membership`, {
      paymentMethod,
      paymentProof,
      paidAmount,
      surplusAnonymous,
      status: status ?? "PENDING",
    }),
    withId(saved.id),
  );
}

// The surplus of a membership payment is the part above the fee. It is worked
// out from the payment, which is the only place the money is kept.
export async function membershipSurplus(memberId: string) {
  const payment = await prisma.payment.findFirstOrThrow({
    where: { memberId, purpose: "MEMBERSHIP" },
  });
  return {
    amount: payment.amount - (payment.feeApplied ?? 0),
    donorName: payment.donorName,
    anonymous: payment.anonymous,
    status: payment.status,
  };
}
