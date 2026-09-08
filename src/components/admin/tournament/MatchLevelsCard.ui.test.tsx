import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MatchLevelsCard from "./MatchLevelsCard";
import { levelRow } from "@tests/ui/ladders";
import type { LevelRow } from "@/lib/matchLevels";

const getMock = vi.fn();
const putMock = vi.fn();
const postMock = vi.fn();
const delMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    put: (...args: unknown[]) => putMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    del: (...args: unknown[]) => delMock(...args),
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

function answering(levels: LevelRow[], rules: unknown[] = []) {
  getMock.mockImplementation(async (url: string) =>
    String(url).includes("moves") ? { rules } : { levels },
  );
}

beforeEach(() => {
  getMock.mockReset();
  putMock.mockReset();
  postMock.mockReset();
  delMock.mockReset();
  answering([MATCH, GAME]);
});

const show = () => render(<MatchLevelsCard activityId="a1" />);

describe("the match levels card", () => {
  it("names the first level as the match itself", async () => {
    show();

    expect((await screen.findAllByText("المباراة")).length).toBeGreaterThan(0);
    expect(screen.getByText("المستوى 2")).toBeDefined();
  });

  it("shows the words of every level it was given", async () => {
    show();

    await screen.findByDisplayValue("لعبة");
    expect(screen.getByDisplayValue("ألعاب")).toBeDefined();
  });

  it("sends the whole ladder back when it is saved", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "حفظ المستويات" }));

    await waitFor(() => expect(putMock).toHaveBeenCalled());
    const body = putMock.mock.calls[0][1] as { levels: LevelRow[] };
    expect(body.levels).toHaveLength(2);
    expect(body.levels[0].endsBy).toBe("COUNT");
    expect(body.levels[1].endsBy).toBeNull();
  });

  it("refuses to save a level with no word for its unit", async () => {
    show();
    fireEvent.change(await screen.findByDisplayValue("لعبة"), { target: { value: "  " } });

    expect(screen.getByRole("button", { name: "حفظ المستويات" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("says which level the ladder was refused for", async () => {
    show();
    fireEvent.change(await screen.findByDisplayValue("لعبة"), { target: { value: "" } });

    expect(screen.getByText(/^المستوى 2 حدد اسم الوحدة/)).toBeDefined();
  });

  it("adds a level at the end", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "إضافة مستوى" }));

    expect(screen.getByText("المستوى 3")).toBeDefined();
  });

  it("removes a level", async () => {
    show();
    fireEvent.click(await screen.findByLabelText("حذف المستوى 2"));

    expect(screen.queryByText("المستوى 2")).toBeNull();
  });

  it("moves a level up", async () => {
    show();
    await screen.findByDisplayValue("لعبة");
    fireEvent.click(screen.getByLabelText("تقديم المستوى 2"));

    const words = screen.getAllByDisplayValue(/المباراة|لعبة/);
    expect((words[0] as HTMLInputElement).value).toBe("لعبة");
  });

  it("offers only the levels the tournament declared to a move", async () => {
    show();
    const picker = (await screen.findByLabelText("المستوى الذي تقع عليه")) as HTMLSelectElement;

    expect([...picker.options].map((option) => option.textContent)).toEqual(["المباراة", "لعبة"]);
  });

  it("declares a move against a level", async () => {
    show();
    fireEvent.change(await screen.findByLabelText("اسم الحركة"), { target: { value: "تيس" } });
    fireEvent.change(screen.getByLabelText("المستوى الذي تقع عليه"), {
      target: { value: "game" },
    });
    fireEvent.click(screen.getByLabelText("تنهي الوحدة التي تقع عليها"));
    fireEvent.click(screen.getByRole("button", { name: "إضافة حركة" }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toMatchObject({
      name: "تيس",
      levelId: "game",
      endsUnit: true,
    });
  });
});

describe("a level that has units recorded in it", () => {
  beforeEach(() => {
    getMock.mockImplementation(async (url: string) =>
      String(url).includes("moves") ? { rules: [] } : { levels: [MATCH, GAME], played: ["game"] },
    );
  });

  it("cannot be removed or moved", async () => {
    show();

    expect((await screen.findByLabelText("حذف المستوى 2")).hasAttribute("disabled")).toBe(true);
    expect(screen.getByLabelText("تقديم المستوى 2").hasAttribute("disabled")).toBe(true);
  });

  it("keeps its words editable", async () => {
    show();

    expect((await screen.findByDisplayValue("لعبة")).hasAttribute("disabled")).toBe(false);
  });
});
