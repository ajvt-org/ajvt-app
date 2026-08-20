import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
