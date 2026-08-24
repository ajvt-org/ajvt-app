import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
