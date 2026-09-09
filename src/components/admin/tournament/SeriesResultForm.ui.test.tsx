import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SeriesResultForm from "./SeriesResultForm";
import { ApiError } from "@/lib/api";
import {
  CHESS_CONFIG,
  SCORED_CONFIG,
  ladderConfig,
  levelRow,
  standingRow,
  unitNode,
} from "@tests/ui/ladders";
import type { SeriesConfig } from "./seriesConfig";
import type { MoveRuleRow, RecordedMoveRow, SeriesStandingRow, UnitRow } from "./seriesTypes";

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();
const delMock = vi.fn();

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    del: (...args: unknown[]) => delMock(...args),
  },
}));

const CHESS = CHESS_CONFIG;
const SCORED = SCORED_CONFIG;

const DEEP = ladderConfig(
  { countedBy: "POINTS", endsBy: "TARGET", unitCount: null, target: 200 },
  { singular: "شوط", countedBy: "POINTS", endsBy: "TARGET", target: 100 },
);
const DEEP_LADDER = [
  ...DEEP.ladder,
  {
    ...DEEP.unit,
    id: "point",
    order: 2,
    singular: "نقطة",
    countedBy: null,
    endsBy: null,
    target: null,
  },
];

function standing(over: Partial<SeriesStandingRow> = {}): SeriesStandingRow {
  return standingRow(over);
}

function unit(id: string, order: number, extra: Partial<UnitRow> = {}): UnitRow {
  return unitNode({ id, order, ...extra }) as UnitRow;
}

const SIDES = ["أحمد", "محمد"];

function mockSeries(state: {
  units: UnitRow[];
  standing: SeriesStandingRow;
  levels?: SeriesConfig["ladder"];
  moves?: RecordedMoveRow[];
  rules?: MoveRuleRow[];
  worthRules?: {
    id: string;
    name: string;
    levelId: string;
    when: "LOSER_ON_NOTHING";
    worth: number;
  }[];
}) {
  getMock.mockImplementation(async (url: string) =>
    String(url).includes("/levels")
      ? { moves: state.rules ?? [], levels: state.levels ?? CHESS.ladder, lock: null }
      : {
          units: state.units,
          moves: state.moves ?? [],
          levels: state.levels ?? CHESS.ladder,
          worthRules: state.worthRules ?? [],
          standing: state.standing,
        },
  );
}

function show(config: SeriesConfig = CHESS) {
  return render(
    <SeriesResultForm
      matchId="m1"
      activityId="a1"
      config={config}
      sides={SIDES}
      onSaved={vi.fn()}
    />,
  );
}

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
  delMock.mockReset();
  mockSeries({ units: [], standing: standing() });
});

describe("recording the top level of a match", () => {
  it("names the level in the heading and in the empty line", async () => {
    show();

    expect(await screen.findByText("وحدات المباراة")).toBeDefined();
    expect(screen.getByText("لم تُسجَّل وحدات بعد")).toBeDefined();
  });

  it("asks for an outcome where the level is decided by one", async () => {
    show();

    expect(await screen.findByLabelText("نتيجة لعبة")).toBeDefined();
  });

  it("asks for two scores where the level is played to a target", async () => {
    mockSeries({ units: [], standing: standing(), levels: SCORED.ladder });
    show(SCORED);

    expect(await screen.findByLabelText("نقاط أحمد")).toBeDefined();
    expect(screen.getByLabelText("نقاط محمد")).toBeDefined();
  });

  it("records the top level in one step without asking for anything under it", async () => {
    show();
    fireEvent.change(await screen.findByLabelText("نتيجة لعبة"), {
      target: { value: "SIDE_A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "إضافة لعبة" }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toEqual({ outcome: "SIDE_A", parentId: null });
  });

  it("shows the units already recorded and who took each", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A" }), unit("u2", 2, { outcome: "DRAW" })],
      standing: standing({ sideATotal: 3, sideBTotal: 1, unitsRecorded: 2 }),
    });
    show();

    expect(await screen.findByText("لعبة 1")).toBeDefined();
    expect(screen.getAllByText("فوز أحمد").length).toBeGreaterThan(0);
    expect(screen.getAllByText("تعادل").length).toBeGreaterThan(0);
  });
});

describe("opening a unit onto the level under it", () => {
  const SETS = [unit("s1", 1, { levelId: "unit", children: [], sideAPoints: 12, sideBPoints: 9 })];

  it("offers nothing to open where the ladder stops at this level", async () => {
    mockSeries({ units: [unit("u1", 1, { outcome: "SIDE_A" })], standing: standing() });
    show();

    await screen.findByText("لعبة 1");
    expect(screen.queryByLabelText("فتح لعبة 1")).toBeNull();
  });

  it("offers to open a unit where a level sits under it", async () => {
    mockSeries({ units: SETS, standing: standing(), levels: DEEP_LADDER });
    show(DEEP);

    expect(await screen.findByLabelText("فتح شوط 1")).toBeDefined();
  });

  it("says what opening a unit with a typed score will do before it does it", async () => {
    mockSeries({ units: SETS, standing: standing(), levels: DEEP_LADDER });
    show(DEEP);
    fireEvent.click(await screen.findByLabelText("فتح شوط 1"));

    expect(screen.getByText("تسجيل وحدات داخل هذه الوحدة يلغي نتيجتها المكتوبة")).toBeDefined();
    expect(screen.getAllByLabelText("نقاط أحمد")).toHaveLength(1);
  });

  it("opens it once the admin says to carry on", async () => {
    mockSeries({ units: SETS, standing: standing(), levels: DEEP_LADDER });
    show(DEEP);
    fireEvent.click(await screen.findByLabelText("فتح شوط 1"));
    fireEvent.click(screen.getByText("متابعة"));

    expect(screen.getAllByLabelText("نقاط أحمد")).toHaveLength(2);
  });

  it("opens a unit with something under it without a warning", async () => {
    const withChild = [
      unit("s1", 1, {
        children: [unit("p1", 1, { levelId: "point", sideAPoints: 101, sideBPoints: 20 })],
        standing: standing({ sideATotal: 1, over: false }),
      }),
    ];
    mockSeries({ units: withChild, standing: standing(), levels: DEEP_LADDER });
    show(DEEP);
    fireEvent.click(await screen.findByLabelText("فتح شوط 1"));

    expect(screen.getByText("نقطة 1")).toBeDefined();
  });

  it("records a unit under the one it was opened from", async () => {
    mockSeries({
      units: [unit("s1", 1, { children: [], standing: null })],
      standing: standing(),
      levels: DEEP_LADDER,
    });
    show(DEEP);
    fireEvent.click(await screen.findByLabelText("فتح شوط 1"));
    fireEvent.change(screen.getAllByLabelText("نقاط أحمد")[0], { target: { value: "101" } });
    fireEvent.change(screen.getAllByLabelText("نقاط محمد")[0], { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "إضافة نقطة" }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toEqual({
      sideAPoints: 101,
      sideBPoints: 20,
      parentId: "s1",
    });
  });

  it("shows a computed score and offers no pencil on a unit with children", async () => {
    const withChild = [
      unit("s1", 1, {
        children: [unit("p1", 1, { levelId: "point", sideAPoints: 101, sideBPoints: 20 })],
        standing: standing({ sideATotal: 1, sideBTotal: 0 }),
      }),
    ];
    mockSeries({ units: withChild, standing: standing(), levels: DEEP_LADDER });
    show(DEEP);

    await screen.findByText("شوط 1");
    expect(screen.queryByLabelText("تعديل شوط 1")).toBeNull();
  });
});

describe("a unit a rule ended", () => {
  it("reads as ended by that rule rather than as a score", async () => {
    const rule: MoveRuleRow = {
      id: "r1",
      name: "تيس",
      unitsToSelf: 2,
      unitsFromOther: 2,
      levelId: "unit",
      endsUnit: true,
      unitWorth: null,
    };
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A", endedBy: rule })],
      standing: standing(),
    });
    show();

    expect(await screen.findByText("أنهتها تيس")).toBeDefined();
  });
});

describe("a unit worth more than one", () => {
  it("says what it counted", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A", worth: 2 })],
      standing: standing(),
    });
    show();

    expect(await screen.findByText("تُحتسب 2")).toBeDefined();
  });
});

describe("correcting and removing", () => {
  it("corrects a unit while the match is unfinished", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A" })],
      standing: standing(),
    });
    show();
    fireEvent.click(await screen.findByLabelText("تعديل لعبة 1"));
    fireEvent.change(screen.getByLabelText("نتيجة لعبة"), { target: { value: "SIDE_B" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ" }));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][0]).toBe("/api/admin/matches/m1/units/u1");
  });

  it("removes a unit", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A" })],
      standing: standing(),
    });
    show();
    fireEvent.click(await screen.findByLabelText("حذف لعبة 1"));

    await waitFor(() => expect(delMock).toHaveBeenCalled());
    expect(delMock.mock.calls[0][0]).toBe("/api/admin/matches/m1/units/u1");
  });

  it("stops offering an editor once the match is over", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A" }), unit("u2", 2, { outcome: "SIDE_A" })],
      standing: standing({ over: true, unitsLeft: 0, winner: "SIDE_A" }),
    });
    show();

    await screen.findByText("لعبة 1");
    expect(screen.queryByLabelText("نتيجة لعبة")).toBeNull();
  });

  it("corrects a unit once the match is over", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A" }), unit("u2", 2, { outcome: "SIDE_A" })],
      standing: standing({ over: true, unitsLeft: 0, winner: "SIDE_A" }),
    });
    show();
    fireEvent.click(await screen.findByLabelText("تعديل لعبة 1"));
    fireEvent.change(screen.getByLabelText("نتيجة لعبة"), { target: { value: "SIDE_B" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ" }));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][0]).toBe("/api/admin/matches/m1/units/u1");
  });

  it("removes a unit once the match is over", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A" }), unit("u2", 2, { outcome: "SIDE_A" })],
      standing: standing({ over: true, unitsLeft: 0, winner: "SIDE_A" }),
    });
    show();
    fireEvent.click(await screen.findByLabelText("حذف لعبة 1"));

    await waitFor(() => expect(delMock).toHaveBeenCalled());
    expect(delMock.mock.calls[0][0]).toBe("/api/admin/matches/m1/units/u1");
  });

  it("offers no new unit once the match is over and says why", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A" }), unit("u2", 2, { outcome: "SIDE_A" })],
      standing: standing({ over: true, unitsLeft: 0, winner: "SIDE_A" }),
    });
    show();

    expect(await screen.findByLabelText("تعديل لعبة 1")).toBeDefined();
    expect(screen.queryByRole("button", { name: "إضافة لعبة" })).toBeNull();
    expect(screen.getByText("لا تقبل وحدات أخرى")).toBeDefined();
  });
});

describe("the moves of a level", () => {
  const teysse: MoveRuleRow = {
    id: "r1",
    name: "تيس",
    unitsToSelf: 2,
    unitsFromOther: 2,
    levelId: "unit",
    endsUnit: false,
    unitWorth: null,
  };

  it("offers only the rules declared for that level", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A" })],
      standing: standing(),
      rules: [teysse, { ...teysse, id: "r2", name: "أخرى", levelId: "elsewhere" }],
    });
    show();

    const picker = (await screen.findByLabelText("تسجيل حركة")) as HTMLSelectElement;
    expect(picker.options).toHaveLength(2);
  });
});

describe("loading the form", () => {
  it("asks for the declared rules where the tournament serves them", async () => {
    show();

    await screen.findByText("وحدات المباراة");
    expect(getMock.mock.calls.map((call) => String(call[0]))).toEqual(
      expect.arrayContaining(["/api/admin/matches/m1/units", "/api/admin/activities/a1/levels"]),
    );
  });

  it("shows what the server refused with rather than its own sentence", async () => {
    getMock.mockRejectedValue(new ApiError("أكمل إعداد جولات البطولة قبل تسجيل نتيجة", 409));
    show();

    expect(await screen.findByText("أكمل إعداد جولات البطولة قبل تسجيل نتيجة")).toBeDefined();
  });

  it("keeps its own sentence when the answer explained nothing", async () => {
    getMock.mockRejectedValue(new ApiError("فشلت العملية", 500));
    show();

    expect(await screen.findByText("تعذّر تحميل جولات المباراة")).toBeDefined();
  });
});

describe("a match whose ladder is one level", () => {
  const ALONE_LEVEL = levelRow({ id: "match", order: 0, singular: "مباراة" });
  const ALONE: SeriesConfig = {
    ladder: [ALONE_LEVEL],
    match: ALONE_LEVEL,
    unit: ALONE_LEVEL,
    hasColours: false,
    firstColourWord: null,
    secondColourWord: null,
  };

  it("offers one place to type the result and no list to add to", async () => {
    mockSeries({ units: [], standing: standing({ unitsLeft: 1 }), levels: ALONE.ladder });
    show(ALONE);

    expect(await screen.findByText("نتيجة المباراة")).toBeDefined();
    expect(screen.getByLabelText("نتيجة مباراة")).toBeDefined();
    expect(screen.getByRole("button", { name: "تسجيل النتيجة" })).toBeDefined();
    expect(screen.queryByText("لم تُسجَّل مباريات بعد")).toBeNull();
  });

  it("records it on the match itself", async () => {
    mockSeries({ units: [], standing: standing({ unitsLeft: 1 }), levels: ALONE.ladder });
    show(ALONE);
    fireEvent.change(await screen.findByLabelText("نتيجة مباراة"), {
      target: { value: "SIDE_A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "تسجيل النتيجة" }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toEqual({ outcome: "SIDE_A", parentId: null });
  });

  it("shows the recorded result as the result rather than as a numbered unit", async () => {
    mockSeries({
      units: [unit("u1", 1, { levelId: "match", outcome: "SIDE_A" })],
      standing: standing({ over: true, unitsLeft: 0, winner: "SIDE_A" }),
      levels: ALONE.ladder,
    });
    show(ALONE);

    expect(await screen.findByText("النتيجة")).toBeDefined();
    expect(screen.getByText("فوز أحمد")).toBeDefined();
    expect(screen.queryByText("مباراة 1")).toBeNull();
  });

  it("still offers the pencil and the trash once the match is over", async () => {
    mockSeries({
      units: [unit("u1", 1, { levelId: "match", outcome: "SIDE_A" })],
      standing: standing({ over: true, unitsLeft: 0, winner: "SIDE_A" }),
      levels: ALONE.ladder,
    });
    show(ALONE);

    expect(await screen.findByLabelText("تعديل النتيجة")).toBeDefined();
    expect(screen.getByLabelText("حذف النتيجة")).toBeDefined();
    expect(screen.queryByText("لا تقبل وحدات أخرى")).toBeNull();
  });

  it("opens the editor on the result that was saved", async () => {
    mockSeries({
      units: [unit("u1", 1, { levelId: "match", outcome: "SIDE_A" })],
      standing: standing({ over: true, unitsLeft: 0, winner: "SIDE_A" }),
      levels: ALONE.ladder,
    });
    show(ALONE);
    fireEvent.click(await screen.findByLabelText("تعديل النتيجة"));

    expect((screen.getByLabelText("نتيجة مباراة") as HTMLSelectElement).value).toBe("SIDE_A");
  });
});

describe("a unit a declared rule says is worth more", () => {
  const RULE = {
    id: "w1",
    name: "قاعدة",
    levelId: "unit",
    when: "LOSER_ON_NOTHING" as const,
    worth: 2,
  };

  it("names the rule that was detected rather than only the number", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A", worth: 2, worthRuleId: "w1" })],
      standing: standing(),
      worthRules: [RULE],
    });
    show();

    expect(await screen.findByText("قاعدة، تُحتسب 2")).toBeDefined();
  });

  it("offers to turn it off for that unit", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A", worth: 2, worthRuleId: "w1" })],
      standing: standing(),
      worthRules: [RULE],
    });
    show();
    fireEvent.click(await screen.findByRole("button", { name: "لا تُطبَّق هنا" }));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][0]).toBe("/api/admin/matches/m1/units/u1/worth");
    expect(patchMock.mock.calls[0][1]).toEqual({ kept: false });
  });

  it("says it is turned off and offers it back", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A", worthRuleId: "w1", worthKept: false })],
      standing: standing(),
      worthRules: [RULE],
    });
    show();

    expect(await screen.findByText("قاعدة موقوفة على هذه الوحدة")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "أعِد تطبيقها" }));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][1]).toEqual({ kept: true });
  });

  it("says nothing where no rule was detected", async () => {
    mockSeries({
      units: [unit("u1", 1, { outcome: "SIDE_A" })],
      standing: standing(),
      worthRules: [RULE],
    });
    show();

    await screen.findByText("لعبة 1");
    expect(screen.queryByRole("button", { name: "لا تُطبَّق هنا" })).toBeNull();
  });
});
