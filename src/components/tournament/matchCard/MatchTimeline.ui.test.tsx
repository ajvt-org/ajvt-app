import { describe, it, expect } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import MatchTimeline from "./MatchTimeline";
import type { TimelineEntry } from "@/lib/matchEvents";
import { matchDisplay as texts } from "@/lib/texts";

const entries: TimelineEntry[] = [
  { key: "g1", minute: 10, type: "goal", name: "أسامه", photo: null, side: "home", note: "" },
  { key: "c1", minute: 31, type: "yellow", name: "سالم", photo: null, side: "away", note: "" },
  { key: "g2", minute: 44, type: "goal", name: "باه", photo: null, side: "home", note: " (ج)" },
];

describe("MatchTimeline", () => {
  it("stays out of a match with nothing to show", () => {
    cleanup();
    const { container } = render(<MatchTimeline entries={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("keeps the events folded away until asked", () => {
    cleanup();
    render(<MatchTimeline entries={entries} />);

    expect(screen.getByText(texts.timeline)).toBeDefined();
    expect(screen.queryByText("أسامه")).toBeNull();
  });

  it("opens on the minute order and closes again", () => {
    cleanup();
    render(<MatchTimeline entries={entries} />);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("أسامه")).toBeDefined();
    expect(screen.getByText("باه (ج)")).toBeDefined();

    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("أسامه")).toBeNull();
  });

  it("names the team each event belongs to", () => {
    cleanup();
    render(<MatchTimeline entries={entries} teams={{ home: "فريق النجم", away: "فريق الأمل" }} />);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getAllByText("فريق النجم")).toHaveLength(2);
    expect(screen.getByText("فريق الأمل")).toBeDefined();
  });

  it("shows a yellow card the match card leaves out", () => {
    cleanup();
    const { container } = render(<MatchTimeline entries={entries} />);

    fireEvent.click(screen.getByRole("button"));
    expect(container.innerHTML).toContain("بطاقة صفراء");
  });

  it("marks an event whose minute was never recorded", () => {
    cleanup();
    render(<MatchTimeline entries={[{ ...entries[0], minute: null }]} />);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("—")).toBeDefined();
  });
});
