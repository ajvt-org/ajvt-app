import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";
import { resetDb, get, createUser, signInAs } from "./helpers";

const announceOpenDay = vi.hoisted(() => vi.fn(async () => 0));
const closeExpiredAttempts = vi.hoisted(() => vi.fn(async () => 0));

vi.mock("@/lib/quizNotify", () => ({ announceOpenDay }));
vi.mock("@/lib/quizAttemptServer", () => ({ closeExpiredAttempts }));

const { GET } = await import("@/app/api/quiz/standings/route");

async function signedInMember() {
  const user = await createUser("22334455");
  await prisma.member.create({
    data: {
      userId: user.id,
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 100,
    },
  });
  await prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: new Date(),
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      servedCount: 2,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: new Date(),
    },
  });
  await signInAs(user);
}

const read = () => GET(get("/api/quiz/standings"));

describe("the upkeep the standings route carries", () => {
  beforeEach(async () => {
    await resetDb();
    announceOpenDay.mockClear();
    closeExpiredAttempts.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-20T10:00:00.000Z"));
    await signedInMember();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("still announces the round and settles what expired", async () => {
    expect((await read()).status).toBe(200);

    expect(announceOpenDay).toHaveBeenCalledTimes(1);
    expect(closeExpiredAttempts).toHaveBeenCalledTimes(1);
  });

  it("does the work once however many readers arrive together", async () => {
    await Promise.all(Array.from({ length: 20 }, () => read()));

    expect(announceOpenDay).toHaveBeenCalledTimes(1);
    expect(closeExpiredAttempts).toHaveBeenCalledTimes(1);
  });

  it("comes back to it once the window has passed", async () => {
    await read();
    vi.setSystemTime(new Date("2026-08-20T10:00:20.000Z"));
    await read();

    expect(announceOpenDay).toHaveBeenCalledTimes(2);
  });
});
