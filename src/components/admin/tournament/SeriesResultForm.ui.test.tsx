import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SeriesResultForm from "./SeriesResultForm";
import { CHESS_CONFIG, SCORED_CONFIG, standingRow } from "@tests/ui/ladders";
import type { SeriesConfig } from "./seriesConfig";
import type {
  AdjustmentRuleRow,
  UnitRow,
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

const CHESS = CHESS_CONFIG;

const MARYASS = SCORED_CONFIG;

function standing(over: Partial<SeriesStandingRow> = {}): SeriesStandingRow {
  return standingRow(over);
}

function part(id: string, order: number, extra: Partial<UnitRow> = {}): UnitRow {
  return {
    id,
    levelId: "unit",
    order,
    abandoned: false,
    outcome: null,
    sideAPoints: null,
    sideBPoints: null,
    sideAColour: null,
    worth: null,
    sideALostCredit: false,
    sideBLostCredit: false,
    children: [],
    standing: null,
    ...extra,
  };
}

const SIDES = ["أحمد", "محمد"];

function mockSeries(state: {
  units: UnitRow[];
  standing: SeriesStandingRow;
  adjustments?: RecordedAdjustmentRow[];
  rules?: AdjustmentRuleRow[];
}) {
  getMock.mockImplementation(async (url: string) =>
    String(url).includes("adjustment-rules")
      ? { rules: state.rules ?? [] }
      : { units: state.units, adjustments: state.adjustments ?? [], standing: state.standing },
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
      : { units: [], adjustments: [], standing: standing() },
  );
});

describe("the series result form", () => {
  it("says nothing has been recorded yet", async () => {
    show();

    expect(await screen.findByText("لم تُسجَّل ألعاب بعد")).toBeDefined();
  });

  it("says what would end the match while it is still open", async () => {
    show();

    expect(await screen.findByText("تنتهي المباراة بلعب كل الألعاب")).toBeDefined();
  });

  it("says the number that ends a match played to a target", async () => {
    mockSeries({ units: [], standing: standing({ unitsLeft: 3 }) });
    show(MARYASS);

    expect(await screen.findByText(/تنتهي المباراة عند/)).toBeDefined();
  });

  it("shows the units already recorded and who took each", async () => {
    mockSeries({
      units: [part("p1", 1, { outcome: "SIDE_A" }), part("p2", 2, { outcome: "DRAW" })],
      standing: standing({ sideATotal: 3, sideBTotal: 1, over: true, winner: "SIDE_A" }),
    });
    show();

    expect(await screen.findByText("فوز أحمد")).toBeDefined();
    expect(screen.getByText("تعادل")).toBeDefined();
    expect(screen.getByText("لعبة 1")).toBeDefined();
  });

  it("renders a half as a half rather than a decimal", async () => {
    mockSeries({
      units: [part("p1", 1, { outcome: "DRAW" })],
      standing: standing({ sideATotal: 1, sideBTotal: 1 }),
    });
    const { container } = show();

    await screen.findAllByText("تعادل");
    expect(container.textContent).toContain("½");
    expect(container.textContent).not.toContain("0.5");
  });

  it("shows a side that owes units as a negative", async () => {
    mockSeries({
      units: [],
      standing: standing({ sideATotal: 4, sideBTotal: -4 }),
    });
    const { container } = show();

    await screen.findByText("لم تُسجَّل ألعاب بعد");
    expect(container.textContent).toContain("−2");
    expect(container.textContent).toContain("2");
  });

  it("asks for an outcome where the units are decided by one", async () => {
    show();

    expect(await screen.findByLabelText("نتيجة الوحدة")).toBeDefined();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
  });

  it("asks for two scores where the units are played to a target", async () => {
    show(MARYASS);

    await waitFor(() => expect(screen.queryAllByRole("spinbutton")).toHaveLength(2));
    expect(screen.queryByLabelText("نتيجة الوحدة")).toBeNull();
  });

  it("sends the outcome it was given", async () => {
    postMock.mockResolvedValue({ units: [], adjustments: [], standing: standing() });
    show();

    fireEvent.change(await screen.findByLabelText("نتيجة الوحدة"), {
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
      units: [part("p1", 1, { outcome: "SIDE_A", sideAColour: "FIRST" })],
      standing: standing({ sideATotal: 2 }),
    });
    show();

    expect(await screen.findByText("أحمد أبيض")).toBeDefined();
  });

  it("says a knockout match is being extended rather than finished", async () => {
    mockSeries({
      units: [part("p1", 1, { outcome: "DRAW" }), part("p2", 2, { outcome: "DRAW" })],
      standing: standing({
        sideATotal: 2,
        sideBTotal: 2,
        unitsRecorded: 2,
        unitsAllowed: 4,
        unitsLeft: 2,
        extending: true,
      }),
    });
    show();

    expect(await screen.findByText("تعادلت، وتُمدَّد ب2 ألعاب")).toBeDefined();
  });

  it("offers no entry once the match is over", async () => {
    mockSeries({
      units: [part("p1", 1, { outcome: "SIDE_A" }), part("p2", 2, { outcome: "SIDE_A" })],
      standing: standing({
        sideATotal: 4,
        over: true,
        level: false,
        winner: "SIDE_A",
        unitsLeft: 0,
      }),
    });
    show();

    await screen.findByText("فازت أحمد");
    expect(screen.queryByLabelText("نتيجة الوحدة")).toBeNull();
    expect(screen.queryByText("إضافة")).toBeNull();
  });

  it("corrects a part while the match is unfinished", async () => {
    mockSeries({
      units: [part("p1", 1, { outcome: "SIDE_A" })],
      standing: standing({ sideATotal: 2, unitsLeft: 1 }),
    });
    patchMock.mockResolvedValue({ units: [], adjustments: [], standing: standing() });
    show();

    fireEvent.click(await screen.findByLabelText("تعديل لعبة 1"));
    fireEvent.change(screen.getByLabelText("نتيجة الوحدة"), { target: { value: "DRAW" } });
    fireEvent.click(screen.getByText("حفظ"));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][0]).toBe("/api/admin/matches/m1/units/p1");
  });

  it("removes a part", async () => {
    mockSeries({
      units: [part("p1", 1, { outcome: "SIDE_A" })],
      standing: standing({ sideATotal: 2, unitsLeft: 1 }),
    });
    delMock.mockResolvedValue({ units: [], adjustments: [], standing: standing() });
    show();

    fireEvent.click(await screen.findByLabelText("حذف لعبة 1"));

    await waitFor(() => expect(delMock).toHaveBeenCalled());
  });

  it("says an abandoned part scored nothing", async () => {
    mockSeries({
      units: [part("p1", 1, { abandoned: true })],
      standing: standing({ unitsRecorded: 1, unitsLeft: 1 }),
    });
    show();

    expect(await screen.findByText("متوقفة")).toBeDefined();
  });
});
