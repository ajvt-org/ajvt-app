import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ElectionResult, { type ElectionResultData } from "./ElectionResult";

function result(over: Partial<ElectionResultData> = {}): ElectionResultData {
  return {
    electorate: 100,
    cast: 40,
    blank: 0,
    rows: [
      { candidateId: "c1", fullName: "الأول", photo: null, votes: 25 },
      { candidateId: "c2", fullName: "الثاني", photo: null, votes: 15 },
    ],
    ...over,
  };
}

function show(data: ElectionResultData, allowBlank = false) {
  return render(<ElectionResult result={data} allowBlank={allowBlank} />);
}

const rowNames = (container: HTMLElement) =>
  [...container.querySelectorAll(".space-y-2\\.5 > div > div > span:first-child")].map((el) =>
    el.textContent?.trim(),
  );

describe("the result anybody reads", () => {
  it("says how many voted, out of how many, and the share", () => {
    show(result());

    expect(screen.getByText("40")).toBeTruthy();
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
  });

  it("reads the candidates by count, the biggest first", () => {
    const { container } = show(result());

    expect(rowNames(container)).toEqual(["الأول", "الثاني"]);
  });

  it("marks the leader when one candidate stands alone at the top", () => {
    const { container } = show(result());

    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("marks nobody on a tie, and invents no winner", () => {
    const { container } = show(
      result({
        rows: [
          { candidateId: "c1", fullName: "الأول", photo: null, votes: 20 },
          { candidateId: "c2", fullName: "الثاني", photo: null, votes: 20 },
        ],
      }),
    );

    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });

  it("marks nobody when nothing but blanks were cast", () => {
    const { container } = show(
      result({
        cast: 12,
        blank: 12,
        rows: [
          { candidateId: "c1", fullName: "الأول", photo: null, votes: 0 },
          { candidateId: "c2", fullName: "الثاني", photo: null, votes: 0 },
        ],
      }),
      true,
    );

    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });

  it("gives the blank its own row at the end, counted in the total", () => {
    const { container } = show(result({ cast: 50, blank: 10, rows: result().rows }), true);

    expect(rowNames(container).at(-1)).toBe("ورقة بيضاء");
    expect(screen.getByText("10 (20%)")).toBeTruthy();
  });

  it("never lets the blank be the leader however many were cast", () => {
    const { container } = show(
      result({
        cast: 100,
        blank: 90,
        rows: [{ candidateId: "c1", fullName: "الأول", photo: null, votes: 10 }],
      }),
      true,
    );

    expect(rowNames(container)).toEqual(["الأول", "ورقة بيضاء"]);
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("leaves the blank row out of an election that did not offer one", () => {
    const { container } = show(result(), false);

    expect(rowNames(container)).not.toContain("ورقة بيضاء");
  });

  it("says so rather than drawing empty bars when nobody voted", () => {
    show(
      result({ cast: 0, rows: [{ candidateId: "c1", fullName: "الأول", photo: null, votes: 0 }] }),
    );

    expect(screen.getByText("لم يسجل أي صوت")).toBeTruthy();
  });

  it("names no voter anywhere", () => {
    const { container } = show(result());

    expect(container.textContent).not.toContain("userId");
  });
});
