import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import MatchMeta from "./MatchMeta";

describe("MatchMeta", () => {
  it("renders nothing when the match carries no context", () => {
    cleanup();
    const { container } = render(<MatchMeta />);

    expect(container.firstChild).toBeNull();
  });

  it("centers the venue against its pin instead of sitting it on the baseline", () => {
    cleanup();
    const { container } = render(<MatchMeta venue="ملعب كوتش" />);

    const venue = [...container.querySelectorAll("span")].find((el) =>
      el.className.includes("inline-flex"),
    );
    expect(venue?.className).toContain("items-center");
    expect(venue?.querySelector("svg")).not.toBeNull();
  });

  it("spells out a shootout next to the score it decided", () => {
    cleanup();
    const { container } = render(<MatchMeta penalties={{ home: 4, away: 3 }} />);

    expect(container.textContent).toContain("ركلات ترجيح");
    expect(container.textContent).toContain("4-3");
  });
});
