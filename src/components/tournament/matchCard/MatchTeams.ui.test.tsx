import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import MatchTeams, { MATCH_TEAMS_SIZES, type MatchTeamsSize } from "./MatchTeams";

const home = { name: "كاستيا A", logo: null };
const away = { name: "اتحاد الجديدة B", logo: null };

describe("MatchTeams", () => {
  it("keeps a Latin-carrying name in its own run and the score in its own", () => {
    cleanup();
    const { container } = render(
      <MatchTeams home={home} away={away} score={{ home: 0, away: 4 }} size="md" />,
    );

    const runs = [...container.querySelectorAll("bdi")].map((b) => b.textContent);
    expect(runs).toContain("كاستيا A");
    expect(runs).toContain("اتحاد الجديدة B");

    const score = [...container.querySelectorAll("span")].find((el) => el.textContent === "0-4");
    expect(score?.getAttribute("dir")).toBe("rtl");
  });

  it("keeps each side of the score in a left to right run, so a minus sign holds", () => {
    cleanup();
    const { container } = render(
      <MatchTeams home={home} away={away} score={{ home: "−1", away: "2" }} size="md" />,
    );

    const owed = [...container.querySelectorAll("bdi")].find((b) => b.textContent === "−1");
    expect(owed?.getAttribute("dir")).toBe("ltr");
  });

  it("falls back to a separator when there is no score", () => {
    cleanup();
    const { container } = render(<MatchTeams home={home} away={away} size="md" />);

    expect(container.textContent).toContain("×");
  });

  it("paints names white on a dark card", () => {
    cleanup();
    const { container } = render(<MatchTeams home={home} away={away} tone="dark" size="md" />);

    const name = container.querySelector("bdi");
    expect(name?.getAttribute("style")).toContain("rgb(255, 255, 255)");
  });

  it("stacks the logo above the name when asked", () => {
    cleanup();
    const { container } = render(<MatchTeams home={home} away={away} layout="stacked" size="md" />);

    expect(container.querySelectorAll(".flex-col").length).toBe(2);
  });

  it("shows the entrant's own photo when there is no team crest", () => {
    cleanup();
    const { container } = render(
      <MatchTeams
        home={{ name: "محمد", logo: null, photo: "p1.jpg" }}
        away={{ name: "سيدي", logo: null, photo: null }}
        entrant="player"
        size="md"
      />,
    );

    const images = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(images).toHaveLength(1);
    expect(images[0]).toContain("/api/files/member/p1.jpg");
  });

  it("keeps the team crest ahead of a photo", () => {
    cleanup();
    const { container } = render(
      <MatchTeams
        home={{ name: "محمد", logo: "l1.png", photo: "p1.jpg" }}
        away={away}
        entrant="player"
        size="md"
      />,
    );

    expect(container.querySelector("img")?.getAttribute("src")).toContain("/api/files/team/l1.png");
  });

  it("falls back to a player glyph for a single entrant and a shield otherwise", () => {
    cleanup();
    const { container: player } = render(
      <MatchTeams home={{ name: "محمد" }} away={{ name: "سيدي" }} entrant="player" size="md" />,
    );
    expect(player.querySelectorAll("img")).toHaveLength(0);
    const playerGlyphs = player.innerHTML;

    cleanup();
    const { container: team } = render(<MatchTeams home={home} away={away} size="md" />);
    const teamGlyphs = team.innerHTML;

    expect(playerGlyphs).not.toBe(teamGlyphs);
  });
});

describe("the crest scale", () => {
  const steps: MatchTeamsSize[] = ["sm", "md", "lg", "xl"];

  it("rises at every step and spans more than the old sixteen pixels", () => {
    const sizes = steps.map((step) => MATCH_TEAMS_SIZES[step].logo);

    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(new Set(sizes).size).toBe(steps.length);
    expect(sizes[3] - sizes[0]).toBeGreaterThan(16);
  });

  it("draws the crest at the size the step names", () => {
    for (const step of steps) {
      cleanup();
      const { container } = render(
        <MatchTeams
          home={{ name: "الصقور", logo: "a.webp" }}
          away={{ name: "النسور", logo: "b.webp" }}
          size={step}
        />,
      );

      const crest = container.querySelector("img");
      expect(crest?.getAttribute("width")).toBe(String(MATCH_TEAMS_SIZES[step].logo));
    }
  });
});
