import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import MatchCardActions from "./MatchCardActions";
import { matchAdmin as texts } from "@/lib/texts";

const noop = vi.fn();

function show(over: Partial<Parameters<typeof MatchCardActions>[0]> = {}) {
  cleanup();
  return render(
    <MatchCardActions
      played={false}
      decided
      football
      showMvp={false}
      showDetails={false}
      onDelete={noop}
      onToggleResultForm={noop}
      onToggleMvp={noop}
      onToggleDetails={noop}
      {...over}
    />,
  );
}

describe("MatchCardActions", () => {
  it("keeps every action on one row of its own", () => {
    const { container } = show();

    const row = container.firstElementChild as HTMLElement;
    expect(row.className).toContain("flex-wrap");
    expect(row.querySelectorAll("button").length).toBe(4);
  });

  it("holds back the result and the vote while the teams are not known", () => {
    show({ decided: false });

    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).not.toContain(texts.enterResult);
    expect(labels).not.toContain(texts.mvpVote);
    expect(screen.getByText(texts.editDetails)).toBeDefined();
  });

  it("sends the delete button to the far end", () => {
    const { container } = show();

    expect((container.firstElementChild?.lastElementChild as HTMLElement).className).toContain(
      "ms-auto",
    );
  });

  it("offers the reorder arrows only where a match can move", () => {
    show();
    expect(screen.queryByLabelText(/تقديم/)).toBeNull();

    show({ onMoveUp: noop, onMoveDown: noop });
    expect(screen.getByLabelText(/تقديم/)).toBeDefined();
  });

  it("keeps the best player button out of a board match", () => {
    show({ football: false });

    expect(screen.queryByText(/أفضل لاعب/)).toBeNull();
  });

  it("says edit once a result has been entered", () => {
    show({ played: true });

    expect(screen.getByText(/تعديل النتيجة/)).toBeDefined();
  });
});
