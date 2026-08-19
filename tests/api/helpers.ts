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

export function post(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patch(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function put(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function del(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method: "DELETE" });
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
