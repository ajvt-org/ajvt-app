import { describe, it, expect } from "vitest";
import { candidateOrderFor } from "./electionBallot";

const candidates = [
  { id: "c3", order: 2 },
  { id: "c1", order: 0 },
  { id: "c2", order: 1 },
  { id: "c4", order: 3 },
  { id: "c5", order: 4 },
];

const named = (rows: { id: string }[]) => rows.map((row) => row.id);
const plain = { id: "e1", shuffleCandidates: false };
const shuffled = { id: "e1", shuffleCandidates: true };

describe("the order a reader sees the candidates in", () => {
  it("follows the order the admin arranged when the toggle is off", () => {
    expect(named(candidateOrderFor(plain, candidates, "u1"))).toEqual([
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
    ]);
  });

  it("gives a voter the same order every time they reload", () => {
    expect(named(candidateOrderFor(shuffled, candidates, "u1"))).toEqual(
      named(candidateOrderFor(shuffled, candidates, "u1")),
    );
  });

  it("gives two accounts their own order", () => {
    const one = named(candidateOrderFor(shuffled, candidates, "u1"));
    const two = named(candidateOrderFor(shuffled, candidates, "u2"));

    expect(one).not.toEqual(two);
  });

  it("gives the same account a different order in a different election", () => {
    const here = named(candidateOrderFor(shuffled, candidates, "u1"));
    const there = named(candidateOrderFor({ id: "e2", shuffleCandidates: true }, candidates, "u1"));

    expect(here).not.toEqual(there);
  });

  it("shows every candidate whichever order it picks", () => {
    expect(named(candidateOrderFor(shuffled, candidates, "u1")).sort()).toEqual(
      named(candidates).sort(),
    );
  });

  it("gives a visitor the admin order, since there is no account to seed with", () => {
    expect(named(candidateOrderFor(shuffled, candidates, null))).toEqual([
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
    ]);
  });

  it("leaves the list it was given alone", () => {
    const given = [...candidates];

    candidateOrderFor(shuffled, given, "u1");

    expect(named(given)).toEqual(named(candidates));
  });
});
