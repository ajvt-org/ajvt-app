import { describe, it, expect } from "vitest";
import { MAX_ENROLLMENTS, mapEnrollments } from "./verifyEnrollments";

const makeActivity = (
  id: string,
  startsAt: Date | null,
  extra: {
    endsAt?: Date | null;
    photo?: string | null;
    isVolunteer?: boolean;
    unplayedMatches?: number;
  } = {},
) => ({
  id,
  activity: {
    title: `نشاط ${id}`,
    photo: extra.photo ?? null,
    startsAt,
    endsAt: extra.endsAt ?? null,
    isVolunteer: extra.isVolunteer ?? false,
    _count: { matches: extra.unplayedMatches ?? 0 },
  },
});

const makeQuiz = (id: string, startsAt: Date) => ({
  id,
  competition: {
    name: `مسابقة ${id}`,
    startsAt,
    roundCount: 5,
    roundPeriodMinutes: 1440,
    roundWindowMinutes: 840,
  },
});

describe("mapEnrollments", () => {
  it("returns an empty list when both inputs are empty", () => {
    expect(mapEnrollments([], [])).toHaveLength(0);
  });

  it("carries the activity title, photo and volunteer flag", () => {
    const result = mapEnrollments(
      [makeActivity("a1", new Date("2026-06-01"), { photo: "p.webp", isVolunteer: true })],
      [],
    );

    expect(result[0]).toMatchObject({
      id: "a1",
      kind: "activity",
      label: "نشاط a1",
      photo: "p.webp",
      isVolunteer: true,
    });
  });

  it("ends a competition when its last round closes, not a period later", () => {
    const startsAt = new Date("2026-03-01T00:00:00Z");

    const result = mapEnrollments([], [makeQuiz("q1", startsAt)]);

    expect(result[0]).toMatchObject({ id: "q1", kind: "competition", photo: null });
    expect(result[0].endsAt?.getTime()).toBe(startsAt.getTime() + (4 * 1440 + 840) * 60_000);
  });

  it("sorts by start date descending and leaves the undated ones last", () => {
    const result = mapEnrollments(
      [
        makeActivity("older", new Date("2026-01-01")),
        makeActivity("unscheduled", null),
        makeActivity("newer", new Date("2026-06-01")),
      ],
      [],
    );

    expect(result.map((i) => i.id)).toEqual(["newer", "older", "unscheduled"]);
  });

  it("merges activities and competitions into one sorted list", () => {
    const result = mapEnrollments(
      [makeActivity("act", new Date("2026-01-01"))],
      [makeQuiz("quiz", new Date("2026-08-01"))],
    );

    expect(result.map((i) => i.id)).toEqual(["quiz", "act"]);
  });

  it("keeps the most recent enrollments when both kinds fill the list", () => {
    const activities = Array.from({ length: MAX_ENROLLMENTS }, (_, i) =>
      makeActivity(`a${i}`, new Date(2020, i, 1)),
    );
    const quizzes = Array.from({ length: MAX_ENROLLMENTS }, (_, i) =>
      makeQuiz(`q${i}`, new Date(2026, i, 1)),
    );

    const result = mapEnrollments(activities, quizzes);

    expect(result).toHaveLength(MAX_ENROLLMENTS);
    expect(result.every((i) => i.kind === "competition")).toBe(true);
  });
});
