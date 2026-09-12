import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import StandingsBoard, { type BoardRow } from "./StandingsBoard";

const rows: BoardRow[] = [
  { rank: 1, userId: "u1", name: "محمد", photoUrl: null, total: 90 },
  { rank: 2, userId: "u2", name: "أحمد", photoUrl: null, total: 60 },
];

function setup(over: Partial<React.ComponentProps<typeof StandingsBoard>> = {}) {
  render(
    <StandingsBoard
      title="ترتيب اليوم"
      rows={rows}
      mine={null}
      meId={null}
      empty="لم يشارك أحد بعد"
      {...over}
    />,
  );
}

describe("StandingsBoard", () => {
  it("lists the board in order", () => {
    setup();

    const names = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(names[0]).toContain("محمد");
    expect(names[1]).toContain("أحمد");
  });

  it("says so when nobody has played", () => {
    setup({ rows: [] });

    expect(screen.getByText("لم يشارك أحد بعد")).toBeDefined();
  });

  it("adds the member's own place when they are off the board", () => {
    setup({ mine: { rank: 14, total: 20 }, meId: "u9" });

    expect(screen.getByText(/ترتيبك 14 بمجموع 20 نقطة/)).toBeDefined();
  });

  it("does not repeat the member's place when they are already listed", () => {
    setup({ mine: { rank: 2, total: 60 }, meId: "u2" });

    expect(screen.queryByText(/ترتيبك/)).toBeNull();
  });

  it("says nothing about a place for a member who has not played", () => {
    setup({ mine: null, meId: "u9" });

    expect(screen.queryByText(/ترتيبك/)).toBeNull();
  });

  it("raises the top three on a podium and lists the rest", () => {
    render(
      <StandingsBoard
        title="ترتيب الجولة"
        rows={[
          { rank: 1, userId: "u1", name: "يوسف", photoUrl: null, total: 41 },
          { rank: 2, userId: "u2", name: "أحمد", photoUrl: null, total: 27 },
          { rank: 3, userId: "u3", name: "محمد", photoUrl: null, total: 21 },
          { rank: 4, userId: "u4", name: "امبيريك", photoUrl: null, total: 18 },
        ]}
        mine={null}
        meId="u9"
        empty="لا ترتيب بعد"
      />,
    );

    expect(screen.getByLabelText("المنصة")).toBeDefined();
    expect(screen.getByText("يوسف")).toBeDefined();
    expect(screen.getByRole("list").textContent).toContain("امبيريك");
    expect(screen.getByRole("list").textContent).not.toContain("يوسف");
  });

  it("shows the member's photo when the row carries one and the icon when it does not", () => {
    setup({
      rows: [
        { rank: 1, userId: "u1", name: "محمد", photoUrl: "/api/files/member/m1.webp", total: 90 },
        { rank: 2, userId: "u2", name: "أحمد", photoUrl: null, total: 60 },
      ],
    });

    const img = screen.getByAltText("محمد") as HTMLImageElement;
    expect(img.src).toContain("/api/files/member/m1-thumb.webp");
    expect(screen.queryByAltText("أحمد")).toBeNull();
  });
});

const OPEN = new Date("2026-09-01T10:00:00Z");
const CLOSE = new Date("2026-09-08T10:00:00Z");

const bar = () => screen.getByRole("progressbar");
const fill = () => (bar().firstElementChild as HTMLElement).style.width;
const announced = () => bar().getAttribute("aria-valuenow");
const fillTone = () => (bar().firstElementChild as HTMLElement).style.background;
const at = (share: number) => new Date(OPEN.getTime() + (CLOSE.getTime() - OPEN.getTime()) * share);

const board = (opensAt: string, closesAt: string, onReached: () => void) => (
  <StandingsBoard
    title="ترتيب الأسبوع"
    rows={rows}
    mine={null}
    meId={null}
    empty="لا ترتيب بعد"
    blockOpensAt={opensAt}
    blockClosesAt={closesAt}
    showBlockTimer={true}
    onReached={onReached}
  />
);

describe("BlockTimer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render the bar when showBlockTimer is false", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(OPEN.getTime() + 60 * 60 * 1000));
    setup({
      blockOpensAt: OPEN.toISOString(),
      blockClosesAt: CLOSE.toISOString(),
      showBlockTimer: false,
    });

    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("does not render the bar when blockOpensAt or blockClosesAt is null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(OPEN.getTime() + 60 * 60 * 1000));
    setup({ blockOpensAt: null, blockClosesAt: null, showBlockTimer: true });

    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("renders the bar when showBlockTimer is true and both dates are present", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(OPEN.getTime() + 60 * 60 * 1000));
    setup({
      blockOpensAt: OPEN.toISOString(),
      blockClosesAt: CLOSE.toISOString(),
      showBlockTimer: true,
    });

    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("fills the whole bar and announces all of the time at block open", () => {
    vi.useFakeTimers();
    vi.setSystemTime(OPEN);
    setup({
      blockOpensAt: OPEN.toISOString(),
      blockClosesAt: CLOSE.toISOString(),
      showBlockTimer: true,
    });

    expect(fill()).toBe("100%");
    expect(announced()).toBe("100");
  });

  it("fills half the bar and announces half the time at the midpoint", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date((OPEN.getTime() + CLOSE.getTime()) / 2));
    setup({
      blockOpensAt: OPEN.toISOString(),
      blockClosesAt: CLOSE.toISOString(),
      showBlockTimer: true,
    });

    expect(fill()).toBe("50%");
    expect(announced()).toBe("50");
  });

  it("empties the bar and announces none of the time when the block has closed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(CLOSE);
    setup({
      blockOpensAt: OPEN.toISOString(),
      blockClosesAt: CLOSE.toISOString(),
      showBlockTimer: true,
    });

    expect(fill()).toBe("0%");
    expect(announced()).toBe("0");
  });

  it("drains the bar as the block runs down", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(OPEN.getTime() + (CLOSE.getTime() - OPEN.getTime()) * 0.25));
    setup({
      blockOpensAt: OPEN.toISOString(),
      blockClosesAt: CLOSE.toISOString(),
      showBlockTimer: true,
    });

    expect(fill()).toBe("75%");
    expect(announced()).toBe("75");
  });

  it("calls onReached once when elapsed reaches 100% and not again on subsequent ticks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(CLOSE.getTime() - 30_000));
    const onReached = vi.fn();
    render(board(OPEN.toISOString(), CLOSE.toISOString(), onReached));

    expect(onReached).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(65_000);
    });

    expect(onReached).toHaveBeenCalledOnce();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(onReached).toHaveBeenCalledOnce();
  });
  it("fires again when the next block closes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(CLOSE.getTime() - 30_000));
    const onReached = vi.fn();
    const { rerender } = render(board(OPEN.toISOString(), CLOSE.toISOString(), onReached));

    await act(async () => {
      vi.advanceTimersByTime(65_000);
    });

    expect(onReached).toHaveBeenCalledOnce();

    const nextClose = new Date(CLOSE.getTime() + (CLOSE.getTime() - OPEN.getTime()));
    vi.setSystemTime(new Date(nextClose.getTime() - 30_000));
    rerender(board(CLOSE.toISOString(), nextClose.toISOString(), onReached));

    await act(async () => {
      vi.advanceTimersByTime(65_000);
    });

    expect(onReached).toHaveBeenCalledTimes(2);
  });
  it("keeps the bar mint while most of the block is left", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(0.5));
    setup({
      blockOpensAt: OPEN.toISOString(),
      blockClosesAt: CLOSE.toISOString(),
      showBlockTimer: true,
    });

    expect(fillTone()).toContain("mint");
  });

  it("turns the bar copper once the block is nearly over", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(0.9));
    setup({
      blockOpensAt: OPEN.toISOString(),
      blockClosesAt: CLOSE.toISOString(),
      showBlockTimer: true,
    });

    expect(fillTone()).toContain("copper");
  });
});
