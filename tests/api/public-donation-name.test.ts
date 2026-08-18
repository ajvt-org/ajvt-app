import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/messages";
import { resetDb } from "./helpers";

vi.mock("@/lib/imageProcessing", async (orig) => {
  const actual = await orig<typeof import("@/lib/imageProcessing")>();
  return {
    ...actual,
    processImage: async () => ({ full: Buffer.from("f"), thumbnail: Buffer.from("t") }),
  };
});

import { POST as DONATE } from "@/app/api/donations/route";

function form(fields: Record<string, string>, ip: string) {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }));
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return new NextRequest("http://localhost/api/donations", {
    method: "POST",
    body: fd,
    headers: { "x-forwarded-for": ip },
  });
}

const base = { amount: "5000", paymentMethod: "بنكيلي" };
let seq = 0;
const nextIp = () => `10.0.0.${++seq}`;

describe("a donation from someone with no account", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses a donor who never answered the name question", async () => {
    const res = await DONATE(form(base, nextIp()));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(money.nameChoiceRequired);
    expect(await prisma.donation.count()).toBe(0);
  });

  it("refuses a donor who asked to be named and left the name empty", async () => {
    const res = await DONATE(form({ ...base, anonymous: "false", donorName: "  " }, nextIp()));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(money.nameRequired);
    expect(await prisma.donation.count()).toBe(0);
  });

  it("refuses a name longer than the board can carry", async () => {
    const res = await DONATE(
      form({ ...base, anonymous: "false", donorName: "م".repeat(51) }, nextIp()),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(money.nameTooLong);
  });

  it("records the name when the donor asked to be named", async () => {
    const res = await DONATE(
      form({ ...base, anonymous: "false", donorName: " محمد ولد أحمد " }, nextIp()),
    );

    expect(res.status).toBe(201);
    expect((await prisma.donation.findFirstOrThrow()).donorName).toBe("محمد ولد أحمد");
  });

  it("records nothing in the name when the donor chose to stay anonymous", async () => {
    const res = await DONATE(form({ ...base, anonymous: "true" }, nextIp()));

    expect(res.status).toBe(201);
    expect((await prisma.donation.findFirstOrThrow()).donorName).toBeNull();
  });

  it("ignores a name typed before the donor switched to anonymous", async () => {
    const res = await DONATE(form({ ...base, anonymous: "true", donorName: "محمد" }, nextIp()));

    expect(res.status).toBe(201);
    expect((await prisma.donation.findFirstOrThrow()).donorName).toBeNull();
  });

  it("still lands as pending, whichever way the donor answered", async () => {
    await DONATE(form({ ...base, anonymous: "true" }, nextIp()));

    expect((await prisma.donation.findFirstOrThrow()).status).toBe("PENDING");
  });
});
