import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import LandingActivities, { type LandingActivity } from "./LandingActivities";
import { landingActivities as texts } from "@/lib/texts";

function activity(over: Partial<LandingActivity> = {}): LandingActivity {
  return {
    id: "a1",
    title: "بطولة الصيف",
    when: null,
    startsAt: null,
    endsAt: null,
    photo: null,
    isVolunteer: false,
    isOpen: true,
    ...over,
  };
}

describe("LandingActivities", () => {
  it("lists an activity whose registration is closed", () => {
    render(<LandingActivities activities={[activity({ isOpen: false })]} />);

    expect(screen.getByText("بطولة الصيف")).toBeDefined();
    expect(screen.getByText(texts.closedChip)).toBeDefined();
  });

  it("says nothing about registration while it is open", () => {
    render(<LandingActivities activities={[activity()]} />);

    expect(screen.queryByText(texts.closedChip)).toBeNull();
  });

  it("keeps the link to the activity on a closed one", () => {
    render(<LandingActivities activities={[activity({ isOpen: false })]} />);

    const link = screen.getByText("بطولة الصيف").closest("a");
    expect(link?.getAttribute("href")).toBe("/activities/a1");
  });
});

describe("an activity row", () => {
  it("wraps a long title instead of cutting it off", () => {
    cleanup();
    const title = "بطولة الناشئين تحت 18 عام لصالح شباب التاكلالت";
    const { container } = render(<LandingActivities activities={[activity({ title })]} />);

    const heading = container.querySelector(".activity-title") as HTMLElement;
    expect(heading.textContent).toBe(title);
    expect(heading.className).not.toContain("truncate");
  });

  it("marks the row of an activity being held right now", () => {
    cleanup();
    const today = new Date();
    const { container } = render(
      <LandingActivities activities={[activity({ startsAt: today, endsAt: today })]} />,
    );

    expect(container.querySelector(".activity-row-live")).not.toBeNull();
  });

  it("dims the row of one that is over", () => {
    cleanup();
    const { container } = render(
      <LandingActivities
        activities={[activity({ startsAt: "2020-01-01", endsAt: "2020-01-02" })]}
      />,
    );

    expect(container.querySelector(".activity-row-done")).not.toBeNull();
  });
});
