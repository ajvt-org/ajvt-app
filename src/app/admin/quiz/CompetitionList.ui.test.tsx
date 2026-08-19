import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompetitionList from "./CompetitionList";
import type { CompetitionRow } from "./competitionTypes";

const row = (over: Partial<CompetitionRow> = {}): CompetitionRow => ({
  id: "c1",
  name: "مسابقة الصيف",
  startsAt: "2026-08-20T08:00:00.000Z",
  visibility: "PUBLIC",
  roundCount: 30,
  roundPeriodMinutes: 1440,
  roundWindowMinutes: 840,
  servedCount: 10,
  poolSize: 30,
  groupSize: 7,
  countingRounds: 6,
  categoryRounds: false,
  speedBands: [{ maxSeconds: null, percent: 50 }],
  startedAt: null,
  _count: { participants: 0, rounds: 0 },
  ...over,
});

describe("CompetitionList", () => {
  it("says so when there is no competition yet", () => {
    render(<CompetitionList rows={[]} selectedId={null} onSelect={() => {}} onCreate={() => {}} />);

    expect(screen.getByText(/لا توجد مسابقة بعد/)).toBeDefined();
  });

  it("lists every competition by name", () => {
    render(
      <CompetitionList
        rows={[row(), row({ id: "c2", name: "مسابقة الشتاء" })]}
        selectedId="c1"
        onSelect={() => {}}
        onCreate={() => {}}
      />,
    );

    expect(screen.getByText("مسابقة الصيف")).toBeDefined();
    expect(screen.getByText("مسابقة الشتاء")).toBeDefined();
  });

  it("counts the participants of a private competition only", () => {
    render(
      <CompetitionList
        rows={[row({ visibility: "PRIVATE", _count: { participants: 4, rounds: 2 } })]}
        selectedId={null}
        onSelect={() => {}}
        onCreate={() => {}}
      />,
    );

    expect(screen.getByText(/4 مشاركاً/)).toBeDefined();
  });

  it("hands back the competition that was picked", async () => {
    const onSelect = vi.fn();
    render(
      <CompetitionList
        rows={[row(), row({ id: "c2", name: "مسابقة الشتاء" })]}
        selectedId="c1"
        onSelect={onSelect}
        onCreate={() => {}}
      />,
    );

    await userEvent.click(screen.getByText("مسابقة الشتاء"));

    expect(onSelect).toHaveBeenCalledWith("c2");
  });

  it("offers to start a new one", async () => {
    const onCreate = vi.fn();
    render(
      <CompetitionList rows={[row()]} selectedId="c1" onSelect={() => {}} onCreate={onCreate} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /مسابقة جديدة/ }));

    expect(onCreate).toHaveBeenCalled();
  });
});
