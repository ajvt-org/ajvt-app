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

    const runs = [...container.querySelectorAll("bdi")].map((b) => b.textContent);
    expect(runs).toContain("كاستيا A");
    expect(runs).toContain("اتحاد الجديدة B");

    const score = [...container.querySelectorAll("span")].find((el) => el.textContent === "0-4");
    expect(score?.getAttribute("dir")).toBe("rtl");
  });

  it("keeps each side of the score in a left to right run, so a minus sign holds", () => {
    cleanup();
    const { container } = render(
      <MatchTeams home={home} away={away} score={{ home: "−1", away: "2" }} />,
    );

    const owed = [...container.querySelectorAll("bdi")].find((b) => b.textContent === "−1");
    expect(owed?.getAttribute("dir")).toBe("ltr");
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

  it("shows the entrant's own photo when there is no team crest", () => {
    cleanup();
    const { container } = render(
      <MatchTeams
        home={{ name: "محمد", logo: null, photo: "p1.jpg" }}
        away={{ name: "سيدي", logo: null, photo: null }}
        entrant="player"
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
      />,
    );

    expect(container.querySelector("img")?.getAttribute("src")).toContain("/api/files/team/l1.png");
  });

  it("falls back to a player glyph for a single entrant and a shield otherwise", () => {
    cleanup();
    const { container: player } = render(
      <MatchTeams home={{ name: "محمد" }} away={{ name: "سيدي" }} entrant="player" />,
    );
    expect(player.querySelectorAll("img")).toHaveLength(0);
    const playerGlyphs = player.innerHTML;

    cleanup();
    const { container: team } = render(<MatchTeams home={home} away={away} />);
    const teamGlyphs = team.innerHTML;

    expect(playerGlyphs).not.toBe(teamGlyphs);
  });
});
