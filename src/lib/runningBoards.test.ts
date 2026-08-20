import { describe, it, expect } from "vitest";
import { droppedBoards, mergeRunningBoards, type HeldBoard } from "./runningBoards";

const held: HeldBoard[] = [
  { id: "b1", blockRounds: 1, counting: 1, wholeRun: false },
  { id: "b2", blockRounds: 7, counting: 6, wholeRun: false },
];

describe("mergeRunningBoards", () => {
  it("takes a new title and period name for a standing that already exists", () => {
    const merged = mergeRunningBoards(held, [
      {
        id: "b1",
        title: "ترتيب اليوم",
        blockTitle: "اليوم",
        blockRounds: 1,
        counting: 1,
        wholeRun: false,
      },
    ]);

    expect(merged[0]).toMatchObject({ id: "b1", title: "ترتيب اليوم", blockTitle: "اليوم" });
  });

  it("refuses to move the block size or the counting of one already running", () => {
    const merged = mergeRunningBoards(held, [
      { id: "b2", title: "الأسبوع", blockTitle: "", blockRounds: 3, counting: 2, wholeRun: true },
    ]);

    expect(merged[0]).toMatchObject({ blockRounds: 7, counting: 6, wholeRun: false });
  });

  it("lets a standing that is being added define its own shape", () => {
    const merged = mergeRunningBoards(held, [
      { title: "أفضل جولتين", blockTitle: "المرحلة", blockRounds: 2, counting: 2, wholeRun: false },
    ]);

    expect(merged[0]).toMatchObject({ id: undefined, blockRounds: 2, counting: 2 });
  });

  it("reads a missing whole run flag on a new standing as false", () => {
    const merged = mergeRunningBoards(held, [
      { title: "جديد", blockTitle: "", blockRounds: 2, counting: 1 } as never,
    ]);

    expect(merged[0].wholeRun).toBe(false);
  });

  it("treats an id nobody holds as a new standing", () => {
    const merged = mergeRunningBoards(held, [
      { id: "gone", title: "جديد", blockTitle: "", blockRounds: 4, counting: 3, wholeRun: false },
    ]);

    expect(merged[0]).toMatchObject({ id: undefined, blockRounds: 4 });
  });

  it("keeps the order the admin sent", () => {
    const merged = mergeRunningBoards(held, [
      { id: "b2", title: "ثان", blockTitle: "", blockRounds: 7, counting: 6, wholeRun: false },
      { id: "b1", title: "أول", blockTitle: "", blockRounds: 1, counting: 1, wholeRun: false },
    ]);

    expect(merged.map((b) => b.id)).toEqual(["b2", "b1"]);
  });
});

describe("droppedBoards", () => {
  it("names the standings the admin left out", () => {
    const merged = mergeRunningBoards(held, [
      { id: "b1", title: "أول", blockTitle: "", blockRounds: 1, counting: 1, wholeRun: false },
    ]);

    expect(droppedBoards(held, merged)).toEqual(["b2"]);
  });

  it("drops nothing when every standing is still there", () => {
    const merged = mergeRunningBoards(held, [
      { id: "b1", title: "أول", blockTitle: "", blockRounds: 1, counting: 1, wholeRun: false },
      { id: "b2", title: "ثان", blockTitle: "", blockRounds: 7, counting: 6, wholeRun: false },
    ]);

    expect(droppedBoards(held, merged)).toEqual([]);
  });

  it("drops everything held when the admin replaces them all", () => {
    const merged = mergeRunningBoards(held, [
      { title: "جديد", blockTitle: "", blockRounds: 2, counting: 1, wholeRun: false },
    ]);

    expect(droppedBoards(held, merged)).toEqual(["b1", "b2"]);
  });
});
