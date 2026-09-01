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
  it("wraps the ordinary actions on a row of their own", () => {
    const { container } = show();

    const [ordinary] = container.firstElementChild!.children;
    expect(ordinary.className).toContain("flex-wrap");
    expect(ordinary.querySelectorAll("button").length).toBe(3);
  });

  it("holds back the result and the vote while the teams are not known", () => {
    show({ decided: false });

    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).not.toContain(texts.enterResult);
    expect(labels).not.toContain(texts.mvpVote);
    expect(screen.getByText(texts.editDetails)).toBeDefined();
  });

  it("keeps the delete off the row the ordinary actions wrap on", () => {
    const { container } = show({ onMoveUp: noop, onMoveDown: noop });
    const [ordinary, destructive] = container.firstElementChild!.children;

    expect(ordinary.querySelector(`[aria-label="${texts.confirmDeleteMatch}"]`)).toBeNull();
    expect(destructive.querySelectorAll("button").length).toBe(1);
    expect(screen.getByLabelText(texts.confirmDeleteMatch)).toBeDefined();
  });

  it("says in words what the destructive button does", () => {
    show();

    expect(screen.getByLabelText(texts.confirmDeleteMatch).textContent).toContain(texts.remove);
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
