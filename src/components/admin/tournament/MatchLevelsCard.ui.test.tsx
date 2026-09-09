import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MatchLevelsCard from "./MatchLevelsCard";
import { levelRow } from "@tests/ui/ladders";
import type { LevelRow } from "@/lib/matchLevels";
import type { MoveRuleRow } from "./seriesTypes";

const getMock = vi.fn();
const putMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    put: (...args: unknown[]) => putMock(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("@/components/Toast", () => ({ useToast: () => vi.fn() }));

const MATCH: LevelRow = levelRow({
  id: "match",
  order: 0,
  singular: "المباراة",
  plural: "المباريات",
  countedBy: "OUTCOME",
  endsBy: "COUNT",
  unitCount: 2,
  unsettled: "DRAW",
});

const GAME: LevelRow = levelRow({
  id: "game",
  order: 1,
  singular: "لعبة",
  plural: "ألعاب",
});

const TEYSSE: MoveRuleRow = {
  id: "r1",
  levelId: "game",
  name: "تيس",
  unitsToSelf: 2,
  unitsFromOther: 2,
  endsUnit: true,
  unitWorth: null,
};

function answering(
  levels: LevelRow[],
  moves: MoveRuleRow[] = [],
  lock: "RECORDED" | "STARTED" | null = null,
) {
  getMock.mockImplementation(async () => ({ levels, moves, lock }));
}

beforeEach(() => {
  getMock.mockReset();
  putMock.mockReset();
  answering([MATCH, GAME]);
});

const show = () => render(<MatchLevelsCard activityId="a1" />);

const saveButton = () => screen.getByRole("button", { name: "حفظ المستويات" });

async function openMoves(name: string) {
  fireEvent.click(await screen.findByRole("button", { name: `حركات ${name}` }));
}

describe("the match levels card", () => {
  it("names the first level as the match itself", async () => {
    show();

    expect((await screen.findAllByText("المباراة")).length).toBeGreaterThan(0);
  });

  it("shows the words of every level it was given", async () => {
    show();

    await screen.findByDisplayValue("لعبة");
    expect(screen.getByDisplayValue("ألعاب")).toBeDefined();
  });

  it("reads a level back as one sentence in the words the admin typed", async () => {
    show();

    expect(
      await screen.findByText("تُلعب 2 ألعاب تُحسب بنتيجتها، وإن تعادلا انتهى متعادلاً"),
    ).toBeDefined();
  });

  it("names the level under it on the fields that are about it", async () => {
    show();

    expect(await screen.findByText("بم تُحسب ألعاب")).toBeDefined();
    expect(screen.getByText("كم لعبة")).toBeDefined();
    expect(screen.getByText("قواعد المباراة عن ألعاب")).toBeDefined();
  });

  it("sends the levels and the moves back in one write", async () => {
    answering([MATCH, GAME], [TEYSSE]);
    show();
    fireEvent.click(await screen.findByRole("button", { name: "حفظ المستويات" }));

    await waitFor(() => expect(putMock).toHaveBeenCalled());
    const body = putMock.mock.calls[0][1] as {
      levels: { endsBy: string | null; key: string }[];
      moves: { name: string; levelKey: string; endsUnit: boolean }[];
    };
    expect(body.levels).toHaveLength(2);
    expect(body.levels[0].endsBy).toBe("COUNT");
    expect(body.levels[1].endsBy).toBeNull();
    expect(body.moves).toEqual([
      expect.objectContaining({ name: "تيس", levelKey: "game", endsUnit: true }),
    ]);
  });

  it("refuses to save a level with no word for its unit", async () => {
    show();
    fireEvent.change(await screen.findByDisplayValue("لعبة"), { target: { value: "  " } });

    expect(saveButton().hasAttribute("disabled")).toBe(true);
  });

  it("puts the fault on the field that caused it", async () => {
    show();
    fireEvent.change(await screen.findByLabelText("كم لعبة"), { target: { value: "" } });

    const field = screen.getByLabelText("كم لعبة").closest("div");
    expect(field?.textContent).toContain("حدد عدد الوحدات التي تُلعب في هذا المستوى");
  });

  it("offers the change a rule needs rather than refusing the save", async () => {
    show();
    fireEvent.change(await screen.findByLabelText("الرصيد الابتدائي"), { target: { value: "26" } });

    fireEvent.click(screen.getByRole("button", { name: "أصلحها" }));

    expect((screen.getByLabelText("يُكتسب في كم لعبة") as HTMLInputElement).value).toBe("1");
    expect(saveButton().hasAttribute("disabled")).toBe(false);
  });

  it("adds a level at the end", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "إضافة مستوى" }));

    expect(screen.getByText("المستوى 3")).toBeDefined();
  });

  it("removes a level", async () => {
    show();
    fireEvent.click(await screen.findByLabelText("حذف المستوى 2"));

    expect(screen.queryByDisplayValue("لعبة")).toBeNull();
  });

  it("moves a level up", async () => {
    show();
    await screen.findByDisplayValue("لعبة");
    fireEvent.click(screen.getByLabelText("تقديم المستوى 2"));

    const words = screen.getAllByDisplayValue(/المباراة|لعبة/);
    expect((words[0] as HTMLInputElement).value).toBe("لعبة");
  });
});

describe("the moves of a level", () => {
  it("reads them where the level they act on is", async () => {
    answering([MATCH, GAME], [TEYSSE]);
    show();
    await openMoves("لعبة");

    expect(screen.getByDisplayValue("تيس")).toBeDefined();
  });

  it("adds one against the level it sits under", async () => {
    show();
    await openMoves("لعبة");
    fireEvent.click(screen.getByRole("button", { name: "إضافة حركة" }));
    fireEvent.change(screen.getByLabelText("اسم الحركة"), { target: { value: "تيس" } });
    fireEvent.click(screen.getByLabelText("تنهي الوحدة التي تقع عليها"));
    fireEvent.click(saveButton());

    await waitFor(() => expect(putMock).toHaveBeenCalled());
    const body = putMock.mock.calls[0][1] as { moves: { levelKey: string }[] };
    expect(body.moves[0]).toMatchObject({ name: "تيس", levelKey: "game", endsUnit: true });
  });

  it("holds back the save while a move has no name", async () => {
    show();
    await openMoves("لعبة");
    fireEvent.click(screen.getByRole("button", { name: "إضافة حركة" }));

    expect(saveButton().hasAttribute("disabled")).toBe(true);
  });

  it("takes a move away with the level it acts on", async () => {
    answering([MATCH, GAME], [TEYSSE]);
    show();
    fireEvent.click(await screen.findByLabelText("حذف المستوى 2"));
    fireEvent.click(saveButton());

    await waitFor(() => expect(putMock).toHaveBeenCalled());
    expect((putMock.mock.calls[0][1] as { moves: unknown[] }).moves).toEqual([]);
  });
});

describe("a configuration that is closed", () => {
  it("says a result is in the way and freezes the whole ladder", async () => {
    answering([MATCH, GAME], [], "RECORDED");
    show();

    expect(
      await screen.findByText("سُجّلت نتائج في هذه البطولة، فلا تتغير قواعد المباراة"),
    ).toBeDefined();
    expect(screen.getByDisplayValue("لعبة").hasAttribute("disabled")).toBe(true);
    expect(screen.getByLabelText("حذف المستوى 2").hasAttribute("disabled")).toBe(true);
    expect(saveButton().hasAttribute("disabled")).toBe(true);
  });

  it("says a date is in the way when nothing has been recorded", async () => {
    answering([MATCH, GAME], [], "STARTED");
    show();

    expect(await screen.findByText("بدأت البطولة، فلا تتغير قواعد المباراة")).toBeDefined();
    expect(screen.getByRole("button", { name: "إضافة مستوى" }).hasAttribute("disabled")).toBe(true);
  });

  it("leaves it open while nothing closed it", async () => {
    show();

    expect((await screen.findByDisplayValue("لعبة")).hasAttribute("disabled")).toBe(false);
    expect(saveButton().hasAttribute("disabled")).toBe(false);
  });
});

describe("a level played to a target", () => {
  const TARGET: LevelRow = levelRow({
    id: "match",
    order: 0,
    singular: "المباراة",
    plural: "المباريات",
    countedBy: "POINTS",
    endsBy: "TARGET",
    unitCount: null,
    target: 100,
    unsettled: "CONTINUE",
    margin: 1,
  });

  it("asks for the margin and not for a number of units", async () => {
    answering([TARGET, GAME]);
    show();

    expect(await screen.findByText("الفارق الذي يحسمه")).toBeDefined();
    expect(screen.queryByText("تُستكمل بكم لعبة")).toBeNull();
  });

  it("saves without one", async () => {
    answering([TARGET, GAME]);
    show();
    fireEvent.click(await screen.findByRole("button", { name: "حفظ المستويات" }));

    await waitFor(() => expect(putMock).toHaveBeenCalled());
    const body = putMock.mock.calls[0][1] as { levels: { continueUnits: number | null }[] };
    expect(body.levels[0].continueUnits).toBeNull();
  });

  it("keeps asking a level counted in units for both", async () => {
    answering([{ ...TARGET, endsBy: "COUNT", unitCount: 2, target: null }, GAME]);
    show();

    expect(await screen.findByText("الفارق الذي يحسمه")).toBeDefined();
    expect(screen.getByText("تُستكمل بكم لعبة")).toBeDefined();
  });
});
