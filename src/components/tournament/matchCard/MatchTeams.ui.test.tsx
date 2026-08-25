import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import MatchTeams from "./MatchTeams";

const home = { name: "كاستيا A", logo: null };
const away = { name: "اتحاد الجديدة B", logo: null };

describe("MatchTeams", () => {
  it("keeps a Latin-carrying name in its own run and the score in its own", () => {
    cleanup();
    const { container } = render(
      <MatchTeams home={home} away={away} score={{ home: 0, away: 4 }} />,
    );

    const names = [...container.querySelectorAll("bdi")].map((b) => b.textContent);
    expect(names).toEqual(["كاستيا A", "اتحاد الجديدة B"]);

    const score = [...container.querySelectorAll("span")].find((el) => el.textContent === "0-4");
    expect(score?.getAttribute("dir")).toBe("rtl");
  });

  it("falls back to a separator when there is no score", () => {
    cleanup();
    const { container } = render(<MatchTeams home={home} away={away} />);

    expect(container.textContent).toContain("×");
  });

  it("paints names white on a dark card", () => {
    cleanup();
    const { container } = render(<MatchTeams home={home} away={away} tone="dark" />);

    const name = container.querySelector("bdi");
    expect(name?.getAttribute("style")).toContain("rgb(255, 255, 255)");
  });

  it("stacks the logo above the name when asked", () => {
    cleanup();
    const { container } = render(<MatchTeams home={home} away={away} layout="stacked" />);

    expect(container.querySelectorAll(".flex-col").length).toBe(2);
  });
});
