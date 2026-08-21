import { describe, it, expect, beforeEach, vi } from "vitest";

const db = vi.hoisted(() => ({
  quizAttempt: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  quizParticipant: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("./prisma", () => ({ prisma: db }));

const { setAttemptVoided, setCompetitionVoided, forgetQuizFootprint, NOTHING_TO_VOID } =
  await import("./quizAttemptServer");

const ATTEMPT = { userId: "u1", round: { index: 2, competitionId: "c1" } };

beforeEach(() => {
  vi.clearAllMocks();
  db.quizAttempt.findUnique.mockResolvedValue(ATTEMPT);
  db.quizAttempt.update.mockResolvedValue({});
  db.quizAttempt.updateMany.mockResolvedValue({ count: 3 });
  db.$transaction.mockResolvedValue([{ count: 4 }, { count: 1 }]);
});

describe("setAttemptVoided", () => {
  it("stamps who voided it and when", async () => {
    await setAttemptVoided("a1", true, "boss");

    const data = db.quizAttempt.update.mock.calls[0][0].data;
    expect(data.voidedBy).toBe("boss");
    expect(data.voidedAt).toBeInstanceOf(Date);
  });

  it("clears both marks when the score is put back", async () => {
    await setAttemptVoided("a1", false, "boss");

    expect(db.quizAttempt.update.mock.calls[0][0].data).toEqual({
      voidedAt: null,
      voidedBy: null,
    });
  });

  it("hands back who it was and which round", async () => {
    expect(await setAttemptVoided("a1", true, "boss")).toEqual({ userId: "u1", round: 2 });
  });

  it("refuses an attempt that is not there", async () => {
    db.quizAttempt.findUnique.mockResolvedValue(null);

    await expect(setAttemptVoided("gone", true, "boss")).rejects.toThrow();
    expect(db.quizAttempt.update).not.toHaveBeenCalled();
  });
});

describe("setCompetitionVoided", () => {
  it("reaches every round the member played in that competition", async () => {
    const rounds = await setCompetitionVoided("c1", "u1", true, "boss");

    expect(rounds).toBe(3);
    expect(db.quizAttempt.updateMany.mock.calls[0][0].where).toEqual({
      userId: "u1",
      round: { competitionId: "c1" },
    });
  });

  it("says so when the member played none of them", async () => {
    db.quizAttempt.updateMany.mockResolvedValue({ count: 0 });

    await expect(setCompetitionVoided("c1", "u1", true, "boss")).rejects.toMatchObject({
      clientMessage: NOTHING_TO_VOID,
    });
  });

  it("puts them all back in one go", async () => {
    await setCompetitionVoided("c1", "u1", false, "boss");

    expect(db.quizAttempt.updateMany.mock.calls[0][0].data).toEqual({
      voidedAt: null,
      voidedBy: null,
    });
  });
});

describe("forgetQuizFootprint", () => {
  it("counts what it removed", async () => {
    expect(await forgetQuizFootprint("u1")).toEqual({ attempts: 4, participations: 1 });
  });

  it("removes the attempts and the invitations together", async () => {
    await forgetQuizFootprint("u1");

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.quizAttempt.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(db.quizParticipant.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });
});
