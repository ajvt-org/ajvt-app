import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TeamIdentityEditor from "./TeamIdentityEditor";
import { teamsTab } from "@/lib/texts";

function show(over: Record<string, unknown> = {}) {
  const onSetFromHomeVillage = vi.fn();
  render(
    <TeamIdentityEditor
      name="فريق النجم"
      logo={null}
      busy={false}
      askVillage
      fromHomeVillage
      onRenameTeam={vi.fn()}
      onSetLogo={vi.fn()}
      onSetFromHomeVillage={onSetFromHomeVillage}
      {...over}
    />,
  );
  return { onSetFromHomeVillage };
}

describe("saying where a team comes from", () => {
  it("is not asked when the tournament is not run by the village", () => {
    show({ askVillage: false });

    expect(screen.queryByLabelText(teamsTab.fromHomeVillage)).toBeNull();
  });

  it("is asked when the tournament is run by the village", () => {
    show();

    expect((screen.getByLabelText(teamsTab.fromHomeVillage) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("sends the answer up when it is unticked", () => {
    const { onSetFromHomeVillage } = show();

    fireEvent.click(screen.getByLabelText(teamsTab.fromHomeVillage));

    expect(onSetFromHomeVillage).toHaveBeenCalledWith(false);
  });

  it("shows a team from elsewhere as unticked", () => {
    show({ fromHomeVillage: false });

    expect((screen.getByLabelText(teamsTab.fromHomeVillage) as HTMLInputElement).checked).toBe(
      false,
    );
  });
});
