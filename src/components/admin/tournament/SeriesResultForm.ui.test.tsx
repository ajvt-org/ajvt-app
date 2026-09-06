import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SeriesResultForm from "./SeriesResultForm";
import type { SeriesConfig } from "./seriesConfig";
import type {
  AdjustmentRuleRow,
  PartRow,
  RecordedAdjustmentRow,
  SeriesStandingRow,
} from "./seriesTypes";

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();
const delMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    del: (...args: unknown[]) => delMock(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const CHESS: SeriesConfig = {
  partsPerMatch: 2,
  matchEnding: "PLAY_ALL",
  partsToWin: null,
  partDecision: "OUTCOME",
  partTarget: null,
  partWord: "لعبة",
  partsWord: "ألعاب",
  hasColours: true,
  firstColourWord: "أبيض",
  secondColourWord: "أسود",
};

const MARYASS: SeriesConfig = {
  partsPerMatch: 3,
  matchEnding: "FIRST_TO",
  partsToWin: 2,
  partDecision: "POINTS",
  partTarget: 100,
  partWord: "جولة",
  partsWord: "جولات",
  hasColours: false,
  firstColourWord: null,
  secondColourWord: null,
};

function standing(over: Partial<SeriesStandingRow> = {}): SeriesStandingRow {
  return {
    sideAHalves: 0,
    sideBHalves: 0,
    partsRecorded: 0,
    partsScored: 0,
    partsLeft: 2,
    partsAllowed: 2,
    target: null,
    over: false,
    level: true,
    extending: false,
    winner: null,
    ...over,
  };
}

function part(id: string, order: number, extra: Partial<PartRow> = {}): PartRow {
  return {
    id,
    order,
    abandoned: false,
    outcome: null,
    sideAPoints: null,
    sideBPoints: null,
    sideAColour: null,
    ...extra,
  };
}

const SIDES = ["أحمد", "محمد"];

function mockSeries(state: {
  parts: PartRow[];
  standing: SeriesStandingRow;
  adjustments?: RecordedAdjustmentRow[];
  rules?: AdjustmentRuleRow[];
}) {
  getMock.mockImplementation(async (url: string) =>
    String(url).includes("adjustment-rules")
      ? { rules: state.rules ?? [] }
      : { parts: state.parts, adjustments: state.adjustments ?? [], standing: state.standing },
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
  getMock.mockImplementation(async (url: string) =>
    String(url).includes("adjustment-rules")
      ? { rules: [] }
      : { parts: [], adjustments: [], standing: standing() },
  );
});

describe("the series result form", () => {
  it("says nothing has been recorded yet", async () => {
    show();

    expect(await screen.findByText("لم تُسجَّل ألعاب بعد")).toBeDefined();
  });

  it("says what would end the match while it is still open", async () => {
    show();

    expect(await screen.findByText("تنتهي المباراة بلعب كل الجولات")).toBeDefined();
  });

  it("says the number that ends a match played to a target", async () => {
    mockSeries({ parts: [], standing: standing({ partsLeft: 3 }) });
    show(MARYASS);

    expect(await screen.findByText(/تنتهي المباراة عند/)).toBeDefined();
  });

  it("shows the parts already recorded and who took each", async () => {
    mockSeries({
      parts: [part("p1", 1, { outcome: "SIDE_A" }), part("p2", 2, { outcome: "DRAW" })],
      standing: standing({ sideAHalves: 3, sideBHalves: 1, over: true, winner: "SIDE_A" }),
    });
    show();

    expect(await screen.findByText("فوز أحمد")).toBeDefined();
    expect(screen.getByText("تعادل")).toBeDefined();
    expect(screen.getByText("لعبة 1")).toBeDefined();
  });

  it("renders a half as a half rather than a decimal", async () => {
    mockSeries({
      parts: [part("p1", 1, { outcome: "DRAW" })],
      standing: standing({ sideAHalves: 1, sideBHalves: 1 }),
    });
    const { container } = show();

    await screen.findAllByText("تعادل");
    expect(container.textContent).toContain("½");
    expect(container.textContent).not.toContain("0.5");
  });

  it("shows a side that owes parts as a negative", async () => {
    mockSeries({
      parts: [],
      standing: standing({ sideAHalves: 4, sideBHalves: -4 }),
    });
    const { container } = show();

    await screen.findByText("لم تُسجَّل ألعاب بعد");
    expect(container.textContent).toContain("−2");
    expect(container.textContent).toContain("2");
  });

  it("asks for an outcome where the parts are decided by one", async () => {
    show();

    expect(await screen.findByLabelText("نتيجة الجولة")).toBeDefined();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
  });

  it("asks for two scores where the parts are played to a target", async () => {
    show(MARYASS);

    await waitFor(() => expect(screen.queryAllByRole("spinbutton")).toHaveLength(2));
    expect(screen.queryByLabelText("نتيجة الجولة")).toBeNull();
  });

  it("sends the outcome it was given", async () => {
    postMock.mockResolvedValue({ parts: [], adjustments: [], standing: standing() });
    show();

    fireEvent.change(await screen.findByLabelText("نتيجة الجولة"), {
      target: { value: "SIDE_B" },
    });
    fireEvent.click(screen.getByText("إضافة"));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toEqual({ outcome: "SIDE_B" });
  });

  it("will not add a part until it has been given one", async () => {
    show();

    const add = await screen.findByRole("button", { name: /إضافة/ });
    expect(add.hasAttribute("disabled")).toBe(true);
  });

  it("says which side had which colour", async () => {
    mockSeries({
      parts: [part("p1", 1, { outcome: "SIDE_A", sideAColour: "FIRST" })],
      standing: standing({ sideAHalves: 2 }),
    });
    show();

    expect(await screen.findByText("أحمد أبيض")).toBeDefined();
  });

  it("says a knockout match is being extended rather than finished", async () => {
    mockSeries({
      parts: [part("p1", 1, { outcome: "DRAW" }), part("p2", 2, { outcome: "DRAW" })],
      standing: standing({
        sideAHalves: 2,
        sideBHalves: 2,
        partsRecorded: 2,
        partsAllowed: 4,
        partsLeft: 2,
        extending: true,
      }),
    });
    show();

    expect(await screen.findByText("تعادلت، وتُمدَّد بجولتين")).toBeDefined();
  });

  it("offers no entry once the match is over", async () => {
    mockSeries({
      parts: [part("p1", 1, { outcome: "SIDE_A" }), part("p2", 2, { outcome: "SIDE_A" })],
      standing: standing({
        sideAHalves: 4,
        over: true,
        level: false,
        winner: "SIDE_A",
        partsLeft: 0,
      }),
    });
    show();

    await screen.findByText("فازت أحمد");
    expect(screen.queryByLabelText("نتيجة الجولة")).toBeNull();
    expect(screen.queryByText("إضافة")).toBeNull();
  });

  it("corrects a part while the match is unfinished", async () => {
    mockSeries({
      parts: [part("p1", 1, { outcome: "SIDE_A" })],
      standing: standing({ sideAHalves: 2, partsLeft: 1 }),
    });
    patchMock.mockResolvedValue({ parts: [], adjustments: [], standing: standing() });
    show();

    fireEvent.click(await screen.findByLabelText("تعديل لعبة 1"));
    fireEvent.change(screen.getByLabelText("نتيجة الجولة"), { target: { value: "DRAW" } });
    fireEvent.click(screen.getByText("حفظ"));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][0]).toBe("/api/admin/matches/m1/parts/p1");
  });

  it("removes a part", async () => {
    mockSeries({
      parts: [part("p1", 1, { outcome: "SIDE_A" })],
      standing: standing({ sideAHalves: 2, partsLeft: 1 }),
    });
    delMock.mockResolvedValue({ parts: [], adjustments: [], standing: standing() });
    show();

    fireEvent.click(await screen.findByLabelText("حذف لعبة 1"));

    await waitFor(() => expect(delMock).toHaveBeenCalled());
  });

  it("says an abandoned part scored nothing", async () => {
    mockSeries({
      parts: [part("p1", 1, { abandoned: true })],
      standing: standing({ partsRecorded: 1, partsLeft: 1 }),
    });
    show();

    expect(await screen.findByText("متوقفة")).toBeDefined();
  });
});
