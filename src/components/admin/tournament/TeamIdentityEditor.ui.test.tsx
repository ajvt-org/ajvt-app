import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TeamIdentityEditor from "./TeamIdentityEditor";
import { teamsTab } from "@/lib/texts";

function show(over: Record<string, unknown> = {}) {
  const onSetFromTaguilalett = vi.fn();
  render(
    <TeamIdentityEditor
      name="فريق النجم"
      logo={null}
      busy={false}
      askVillage
      fromTaguilalett
      onRenameTeam={vi.fn()}
      onSetLogo={vi.fn()}
      onSetFromTaguilalett={onSetFromTaguilalett}
      {...over}
    />,
  );
  return { onSetFromTaguilalett };
}

describe("saying where a team comes from", () => {
  it("is not asked when the tournament is not run by the village", () => {
    show({ askVillage: false });

    expect(screen.queryByLabelText(teamsTab.fromTaguilalett)).toBeNull();
  });

  it("is asked when the tournament is run by the village", () => {
    show();

    expect((screen.getByLabelText(teamsTab.fromTaguilalett) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("sends the answer up when it is unticked", () => {
    const { onSetFromTaguilalett } = show();

    fireEvent.click(screen.getByLabelText(teamsTab.fromTaguilalett));

    expect(onSetFromTaguilalett).toHaveBeenCalledWith(false);
  });

  it("shows a team from elsewhere as unticked", () => {
    show({ fromTaguilalett: false });

    expect((screen.getByLabelText(teamsTab.fromTaguilalett) as HTMLInputElement).checked).toBe(
      false,
    );
  });
});
