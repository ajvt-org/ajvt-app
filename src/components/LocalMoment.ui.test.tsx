import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import LocalMoment from "./LocalMoment";

const zone = process.env.TZ;

describe("a printed election moment", () => {
  afterEach(() => {
    cleanup();
    process.env.TZ = zone;
  });

  it("prints the moment on the clock of the device reading it", () => {
    process.env.TZ = "America/Toronto";
    render(<LocalMoment at="2026-09-23T14:15:00.000Z" />);

    expect(screen.getByText("2026/09/23")).toBeTruthy();
    expect(screen.getByText("10:15")).toBeTruthy();
  });

  it("puts the date first, each part in its own left to right run", () => {
    process.env.TZ = "Africa/Nouakchott";
    const { container } = render(<LocalMoment at="2026-09-23T14:15:00.000Z" />);

    const runs = [...container.querySelectorAll("bdi")];
    expect(runs.map((run) => run.textContent)).toEqual(["2026/09/23", "14:15"]);
    expect(runs.every((run) => run.getAttribute("dir") === "ltr")).toBe(true);
  });
});
