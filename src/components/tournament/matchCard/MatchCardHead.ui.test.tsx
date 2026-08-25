import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import MatchCardHead from "./MatchCardHead";
import MatchCardFooter from "./MatchCardFooter";
import MatchMeta from "./MatchMeta";

describe("MatchCardHead", () => {
  it("renders nothing for a match with neither a time nor a round", () => {
    cleanup();
    const { container } = render(<MatchCardHead />);

    expect(container.firstChild).toBeNull();
  });

  it("sends the time to the far corner and leaves the round on the other side", () => {
    cleanup();
    const { container } = render(
      <MatchCardHead time="16:00">
        <MatchMeta round="الجولة 1" />
      </MatchCardHead>,
    );

    const head = container.firstElementChild as HTMLElement;
    expect(head.className).toContain("justify-between");
    expect(head.lastElementChild?.className).toContain("match-time");
    expect(head.firstElementChild?.textContent).toContain("الجولة 1");
  });

  it("keeps the time in its corner when the match has nothing else to say", () => {
    cleanup();
    const { container } = render(<MatchCardHead time="16:00" />);

    const head = container.firstElementChild as HTMLElement;
    expect(head.childElementCount).toBe(2);
    expect(head.lastElementChild?.textContent).toBe("16:00");
  });

  it("reads the hour left to right and centers the clock on it", () => {
    cleanup();
    const { container } = render(<MatchCardHead time="16:00" />);

    const pill = container.querySelector(".match-time") as HTMLElement;
    expect(pill.querySelector("svg")).not.toBeNull();
    expect(pill.querySelector("span")?.getAttribute("dir")).toBe("ltr");
    expect(pill.querySelector("span")?.className).toContain("optical-numeral");
  });

  it("dims the pill into a dark card", () => {
    cleanup();
    const { container } = render(<MatchCardHead time="16:00" tone="dark" />);

    expect(container.querySelector(".match-time")?.className).toContain("match-time-dark");
  });
});

describe("MatchCardFooter", () => {
  it("pushes what it carries to the end of the card", () => {
    cleanup();
    const { container } = render(
      <MatchCardFooter>
        <button>مشاركة</button>
      </MatchCardFooter>,
    );

    expect((container.firstElementChild as HTMLElement).className).toContain("justify-end");
  });
});
