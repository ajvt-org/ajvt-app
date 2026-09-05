import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TournamentSetupFields from "./TournamentSetupFields";
import { tournamentSetup as texts } from "@/lib/texts";

function show(over: Record<string, unknown> = {}) {
  const handlers = {
    onFormat: vi.fn(),
    onPreset: vi.fn(),
    onMinTeamSize: vi.fn(),
    onMaxTeamSize: vi.fn(),
    onOrganisedByHomeVillage: vi.fn(),
    onOutsidePlayerLimit: vi.fn(),
  };
  render(
    <TournamentSetupFields
      format="KNOCKOUT"
      profile="FOOTBALL"
      minTeamSize="16"
      maxTeamSize="22"
      organisedByHomeVillage={false}
      outsidePlayerLimit=""
      {...handlers}
      {...over}
    />,
  );
  return handlers;
}

describe("the squad size on a tournament", () => {
  it("asks for both ends of the range", () => {
    show();

    expect((screen.getByLabelText(texts.minTeamSize) as HTMLInputElement).value).toBe("16");
    expect((screen.getByLabelText(texts.maxTeamSize) as HTMLInputElement).value).toBe("22");
  });

  it("sends each end up as it is typed", () => {
    const handlers = show();

    fireEvent.change(screen.getByLabelText(texts.maxTeamSize), { target: { value: "20" } });

    expect(handlers.onMaxTeamSize).toHaveBeenCalledWith("20");
  });

  it("carries no prose under either field", () => {
    const { container } = render(
      <TournamentSetupFields
        format="KNOCKOUT"
        profile="FOOTBALL"
        minTeamSize="16"
        maxTeamSize="22"
        organisedByHomeVillage
        outsidePlayerLimit="4"
        onFormat={vi.fn()}
        onPreset={vi.fn()}
        onMinTeamSize={vi.fn()}
        onMaxTeamSize={vi.fn()}
        onOrganisedByHomeVillage={vi.fn()}
        onOutsidePlayerLimit={vi.fn()}
      />,
    );

    expect(container.querySelectorAll("p.text-xs")).toHaveLength(0);
  });
});

describe("a tournament run by the village", () => {
  it("keeps the outside limit out of the way until the toggle is on", () => {
    show();

    expect(screen.queryByLabelText(texts.outsidePlayerLimit)).toBeNull();
  });

  it("asks for the outside limit once the toggle is on", () => {
    show({ organisedByHomeVillage: true, outsidePlayerLimit: "4" });

    expect((screen.getByLabelText(texts.outsidePlayerLimit) as HTMLInputElement).value).toBe("4");
  });

  it("sends the toggle up", () => {
    const handlers = show();

    fireEvent.click(screen.getByLabelText(texts.organisedByHomeVillage));

    expect(handlers.onOrganisedByHomeVillage).toHaveBeenCalledWith(true);
  });
});
