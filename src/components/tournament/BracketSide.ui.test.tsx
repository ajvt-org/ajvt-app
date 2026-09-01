import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BracketSide from "./BracketSide";
import { publicTournament as texts } from "@/lib/texts";

const LONG = "نادي شباب قرية التاكلالت الرياضي";

const show = (team: { id: string; name: string; logo?: string | null } | null) =>
  render(
    <BracketSide
      team={team}
      score={null}
      penalties={null}
      played={false}
      winner={false}
      height={32}
      background="white"
    />,
  );

describe("BracketSide", () => {
  it("carries the whole name even where the cell can only show part of it", () => {
    show({ id: "t1", name: LONG, logo: null });

    const name = screen.getByText(LONG);
    expect(name.className).toContain("truncate");
    expect(name.getAttribute("title")).toBe(LONG);
  });

  it("gives a slot with no team nothing to hover", () => {
    show(null);

    expect(screen.getByText(texts.teamDecidedLater).getAttribute("title")).toBeNull();
  });

  it("keeps the name from pushing the score out of the cell", () => {
    const { container } = show({ id: "t1", name: LONG, logo: null });

    expect((container.firstElementChild?.firstElementChild as HTMLElement).className).toContain(
      "min-w-0",
    );
  });
});
