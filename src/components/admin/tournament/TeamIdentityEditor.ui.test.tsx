import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import TeamIdentityEditor, { CREST } from "./TeamIdentityEditor";
import { teamsTab } from "@/lib/texts";

afterEach(cleanup);

function show(over: Record<string, unknown> = {}) {
  const onRenameTeam = vi.fn();
  const onSetLogo = vi.fn();
  const onToggle = vi.fn();
  const { container } = render(
    <details open>
      <summary
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
      >
        <TeamIdentityEditor
          name="فريق النجم"
          shownName="فريق النجم"
          logo={null}
          busy={false}
          controls={<span data-testid="controls" />}
          onRenameTeam={onRenameTeam}
          onSetLogo={onSetLogo}
          {...over}
        >
          <p>لاعبان</p>
        </TeamIdentityEditor>
      </summary>
    </details>,
  );
  return { onRenameTeam, onSetLogo, onToggle, container };
}

describe("the crest a team is edited from", () => {
  it("draws one crest, which is the control that changes it", () => {
    show();

    const crest = screen.getByLabelText(teamsTab.changeTeamLogo);
    expect(crest.tagName).toBe("BUTTON");
    expect(screen.getAllByLabelText(teamsTab.changeTeamLogo)).toHaveLength(1);
  });

  it("takes the next step on the shared scale", () => {
    show();

    const crest = screen.getByLabelText(teamsTab.changeTeamLogo);
    expect(crest.style.width).toBe(`${CREST}px`);
    expect(crest.style.height).toBe(`${CREST}px`);
  });

  it("opens the file picker without toggling the card", () => {
    const { container, onToggle } = show();
    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    const picked = vi.fn();
    input.addEventListener("click", picked);

    fireEvent.click(screen.getByLabelText(teamsTab.changeTeamLogo));

    expect(picked).toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe("renaming a team from its name", () => {
  it("offers a pencil beside the name and no labelled button", () => {
    show();

    expect(screen.getByLabelText(teamsTab.renameTeam)).toBeDefined();
    expect(screen.queryByText(teamsTab.renameTeam)).toBeNull();
  });

  it("renames in place and sends the new name up", () => {
    const { onRenameTeam } = show();

    fireEvent.click(screen.getByLabelText(teamsTab.renameTeam));
    fireEvent.change(screen.getByDisplayValue("فريق النجم"), {
      target: { value: "فريق الوحدة" },
    });
    fireEvent.click(screen.getByText(teamsTab.save));

    expect(onRenameTeam).toHaveBeenCalledWith("فريق الوحدة");
  });

  it("presses the pencil without toggling the card", () => {
    const { onToggle } = show();

    fireEvent.click(screen.getByLabelText(teamsTab.renameTeam));

    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("فريق النجم")).toBeDefined();
  });

  it("leaves the card alone while the new name is being typed", () => {
    const { onToggle } = show();

    fireEvent.click(screen.getByLabelText(teamsTab.renameTeam));
    fireEvent.click(screen.getByDisplayValue("فريق النجم"));
    fireEvent.click(screen.getByText(teamsTab.cancel));

    expect(onToggle).not.toHaveBeenCalled();
  });

  it("gives the rename the whole line and takes the controls off it", () => {
    show();

    expect(screen.getByTestId("controls")).toBeDefined();

    fireEvent.click(screen.getByLabelText(teamsTab.renameTeam));

    expect(screen.queryByTestId("controls")).toBeNull();
  });

  it("keeps the readout under the name whether or not it is being renamed", () => {
    show();

    expect(screen.getByText("لاعبان")).toBeDefined();

    fireEvent.click(screen.getByLabelText(teamsTab.renameTeam));

    expect(screen.getByText("لاعبان")).toBeDefined();
  });
});
