import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CandidateCard from "./CandidateCard";
import type { ElectionCandidateRow } from "./electionTypes";

const LONG = "محمد الأمين ولد أحمد ولد سيدي ولد الطالب";

function show(over: Partial<ElectionCandidateRow> = {}, frozen = false) {
  const candidate: ElectionCandidateRow = {
    id: "c1",
    fullName: LONG,
    photo: null,
    order: 0,
    _count: { ballots: 0 },
    ...over,
  };
  return render(
    <CandidateCard
      candidate={candidate}
      frozen={frozen}
      busy={false}
      onEdit={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
}

describe("the candidate card", () => {
  it("writes a five word name out in full, with no clamp and no cut", () => {
    show();

    const name = screen.getByText(LONG);
    expect(name.className).toContain("activity-title");
    expect(name.className).not.toContain("truncate");
    expect(name.className).not.toContain("line-clamp");
  });

  it("names the candidate in the label of each action, not the bare verb", () => {
    show();

    expect(screen.getByRole("button", { name: `تعديل ${LONG}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: `حذف ${LONG}` })).toBeTruthy();
  });

  it("puts the actions on their own line, clear of the name", () => {
    const { container } = show();

    const actions = screen.getByRole("button", { name: `تعديل ${LONG}` }).parentElement;
    const identity = screen.getByText(LONG).parentElement;
    expect(actions).not.toBe(identity);
    expect(container.querySelectorAll(".card > div").length).toBe(2);
  });

  it("falls back to a mark when a candidate has no photograph", () => {
    show({ photo: null });

    expect(screen.queryByRole("img")).toBeNull();
  });

  it("serves a photograph through the public candidate route", () => {
    show({ photo: "poster.webp" });

    expect(screen.getByRole("img").getAttribute("src")).toBe("/api/files/candidate/poster.webp");
  });

  it("takes the actions away once the vote has opened", () => {
    show({}, true);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
