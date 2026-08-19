import { NextRequest } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { setCookie, clearCookies } from "./cookieJar";

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  await prisma.questionBank.create({ data: { id: "general", name: "البنك العام" } });
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

export async function createUser(phone = "22334455", password = "secret") {
  return prisma.user.create({
    data: { phone, password: await bcrypt.hash(password, 4) },
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
  const token = await signToken({ userId: user.id, tokenVersion: user.tokenVersion });
  setCookie("user_token", token);
  return token;
}

export async function signInAsAdmin(admin: { id: string; username: string; tokenVersion: number }) {
  const token = await signToken({
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
