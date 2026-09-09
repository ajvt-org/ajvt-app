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
  countedBy: "OUTCOME",
  endsBy: "COUNT",
  unitCount: 2,
  unsettled: "DRAW",
});

const GAME: LevelRow = levelRow({
  id: "game",
  order: 1,
  singular: "لعبة",
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
  worthRules: object[] = [],
) {
  getMock.mockImplementation(async () => ({ levels, moves, worthRules, lock }));
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

async function openRules() {
  const folds = await screen.findAllByRole("button", { name: "قواعد هذا المستوى" });
  folds.forEach((fold) => fireEvent.click(fold));
}

describe("the match levels card", () => {
  it("names the first level as the match itself", async () => {
    show();

    expect((await screen.findAllByText("المباراة")).length).toBeGreaterThan(0);
  });

  it("shows the one name of every level it was given", async () => {
    show();

    await screen.findByDisplayValue("لعبة");
    expect(screen.getByDisplayValue("المباراة")).toBeDefined();
  });

  it("says nothing back about a level the fields under it already state", async () => {
    show();

    await screen.findByDisplayValue("لعبة");
    expect(
      screen.queryByText("تُلعب 2 ألعاب تُحسب بنتيجتها، وإن تعادلا انتهى متعادلاً"),
    ).toBeNull();
  });

  it("keeps the rules of a level folded away until they are asked for", async () => {
    show();

    await screen.findByDisplayValue("لعبة");
    expect(screen.queryByText("بم تُحسب الوحدات")).toBeNull();

    await openRules();
    expect(screen.getByText("بم تُحسب الوحدات")).toBeDefined();
    expect(screen.getByText("كم وحدة")).toBeDefined();
  });

  it("titles the rules once and not by the words of the level under it", async () => {
    show();
    await openRules();

    expect(screen.queryByText("قواعد المباراة عن ألعاب")).toBeNull();
    expect(screen.getAllByText("قواعد هذا المستوى")).toHaveLength(1);
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

  it("refuses to save a level with no name", async () => {
    show();
    fireEvent.change(await screen.findByDisplayValue("لعبة"), { target: { value: "  " } });

    expect(saveButton().hasAttribute("disabled")).toBe(true);
  });

  it("puts the fault on the field that caused it", async () => {
    show();
    await openRules();
    fireEvent.change(await screen.findByLabelText("كم وحدة"), { target: { value: "" } });

    const field = screen.getByLabelText("كم وحدة").closest("div");
    expect(field?.textContent).toContain("حدد عدد الوحدات التي تُلعب في هذا المستوى");
  });

  it("offers the change a rule needs rather than refusing the save", async () => {
    show();
    await openRules();
    fireEvent.change(await screen.findByLabelText("الرصيد الابتدائي"), { target: { value: "26" } });

    fireEvent.click(screen.getByRole("button", { name: "أصلحها" }));

    expect((screen.getByLabelText("يُكتسب في كم وحدة") as HTMLInputElement).value).toBe("1");
    expect(saveButton().hasAttribute("disabled")).toBe(false);
  });

  it("names the field a margin the level cannot reach belongs to", async () => {
    show();
    await openRules();
    fireEvent.change(screen.getByLabelText("إن لم يُحسم"), { target: { value: "CONTINUE" } });
    fireEvent.change(screen.getByLabelText("الفارق الذي يحسمه"), { target: { value: "5" } });

    const field = screen.getByLabelText("الفارق الذي يحسمه").closest("div");
    expect(field?.textContent).toContain("أكبر مما ينهيه");
  });

  it("offers the widest margin the level can reach rather than refusing the save", async () => {
    show();
    await openRules();
    fireEvent.change(screen.getByLabelText("إن لم يُحسم"), { target: { value: "CONTINUE" } });
    fireEvent.change(screen.getByLabelText("الفارق الذي يحسمه"), { target: { value: "5" } });

    fireEvent.click(screen.getByRole("button", { name: "أصلحها" }));

    expect((screen.getByLabelText("الفارق الذي يحسمه") as HTMLInputElement).value).toBe("2");
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
    fireEvent.click(screen.getByRole("button", { name: "تيس" }));

    expect(screen.getByDisplayValue("تيس")).toBeDefined();
  });

  it("adds one against the level it sits under", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "إضافة حركة" }));
    fireEvent.change(screen.getByLabelText("اسم الحركة"), { target: { value: "تيس" } });
    fireEvent.click(screen.getByLabelText("تنهي الوحدة التي تقع عليها"));
    fireEvent.click(saveButton());

    await waitFor(() => expect(putMock).toHaveBeenCalled());
    const body = putMock.mock.calls[0][1] as { moves: { levelKey: string }[] };
    expect(body.moves[0]).toMatchObject({ name: "تيس", levelKey: "game", endsUnit: true });
  });

  it("holds back the save while a move has no name", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "إضافة حركة" }));

    expect(saveButton().hasAttribute("disabled")).toBe(true);
  });

  it("offers one control and nothing else where a level declares none", async () => {
    show();

    expect(await screen.findByRole("button", { name: "إضافة حركة" })).toBeDefined();
    expect(screen.queryByText("لا حركات معرّفة")).toBeNull();
    expect(screen.queryByRole("button", { name: "حركات لعبة" })).toBeNull();
  });

  it("titles the block once where a level declares one", async () => {
    answering([MATCH, GAME], [TEYSSE]);
    show();

    expect(await screen.findByRole("button", { name: "حركات لعبة" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "إضافة حركة" })).toBeNull();
  });

  it("folds a declared move away and opens it when it is asked for", async () => {
    answering([MATCH, GAME], [TEYSSE]);
    show();
    await openMoves("لعبة");

    expect(screen.queryByLabelText("ما تضيفه")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "تيس" }));
    expect(screen.getByLabelText("ما تضيفه")).toBeDefined();
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
    await openRules();

    expect(await screen.findByText("الفارق الذي يحسمه")).toBeDefined();
    expect(screen.queryByText("تُستكمل بكم وحدة")).toBeNull();
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
    await openRules();

    expect(await screen.findByText("الفارق الذي يحسمه")).toBeDefined();
    expect(screen.getByText("تُستكمل بكم وحدة")).toBeDefined();
  });
});

describe("what a level says a unit is worth", () => {
  it("offers one control where a level declares no such rule", async () => {
    show();

    expect(await screen.findByRole("button", { name: "إضافة قاعدة احتساب" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "احتساب لعبة" })).toBeNull();
  });

  it("asks for a name, a condition and a number", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "إضافة قاعدة احتساب" }));

    expect(screen.getByLabelText("اسم القاعدة")).toBeDefined();
    expect(screen.getByLabelText("متى تقع")).toBeDefined();
    expect(screen.getByLabelText("العدد الذي تُحتسب به الوحدة")).toBeDefined();
  });

  it("holds back the save until the rule says what it is", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "إضافة قاعدة احتساب" }));

    expect(saveButton().hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("اسم القاعدة"), { target: { value: "قاعدة" } });
    expect(saveButton().hasAttribute("disabled")).toBe(false);
  });

  it("sends it back with the level it was declared on", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "إضافة قاعدة احتساب" }));
    fireEvent.change(screen.getByLabelText("اسم القاعدة"), { target: { value: "قاعدة" } });
    fireEvent.change(screen.getByLabelText("العدد الذي تُحتسب به الوحدة"), {
      target: { value: "3" },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(putMock).toHaveBeenCalled());
    const body = putMock.mock.calls[0][1] as {
      worthRules: { name: string; levelKey: string; when: string[]; worth: number }[];
    };
    expect(body.worthRules).toEqual([
      { id: null, name: "قاعدة", levelKey: "game", when: ["LOSER_ON_NOTHING"], worth: 3 },
    ]);
  });

  it("titles the block once where a level declares one", async () => {
    answering([MATCH, GAME], [], null, [
      { id: "w1", name: "قاعدة", levelId: "game", when: ["LOSER_ON_NOTHING"], worth: 2 },
    ]);
    show();

    expect(await screen.findByRole("button", { name: "احتساب لعبة" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "إضافة قاعدة احتساب" })).toBeNull();
  });

  it("takes a rule away with the level it was declared on", async () => {
    answering([MATCH, GAME], [], null, [
      { id: "w1", name: "قاعدة", levelId: "game", when: ["LOSER_ON_NOTHING"], worth: 2 },
    ]);
    show();
    fireEvent.click(await screen.findByLabelText("حذف المستوى 2"));
    fireEvent.click(saveButton());

    await waitFor(() => expect(putMock).toHaveBeenCalled());
    expect((putMock.mock.calls[0][1] as { worthRules: unknown[] }).worthRules).toEqual([]);
  });
});
