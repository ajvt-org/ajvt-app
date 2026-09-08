import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import MyTeamCard from "./MyTeamCard";
import type { MyTeamView } from "@/lib/myTeamServer";
import { teamBuilder as texts, confirmDialog, confirmDelete } from "@/lib/texts";

const dialog = () => within(document.querySelector(".fixed.inset-0") as HTMLElement);

const CAPTAIN = "u1";
const PLAYER = "u2";

const handlers = {
  onInvite: vi.fn(),
  onAnswerRequest: vi.fn(),
  onRemove: vi.fn(),
  onHandOver: vi.fn(),
  onDisband: vi.fn(),
  onLeave: vi.fn(),
};

function team(): NonNullable<MyTeamView["team"]> {
  return {
    id: "t1",
    name: "فريق الصقور",
    captainUserId: CAPTAIN,
    members: [
      { userId: CAPTAIN, fullName: "محمد ولد أحمد", photo: null, kind: "member" },
      { userId: PLAYER, fullName: "سالم ولد علي", photo: null, kind: "member" },
    ],
  };
}

function show(viewerId: string, locked = false) {
  cleanup();
  render(
    <MyTeamCard
      team={team()}
      candidates={[]}
      squad={{ min: null, max: null }}
      viewerId={viewerId}
      locked={locked}
      busy={false}
      {...handlers}
    />,
  );
}

describe("a captain asking through the app rather than the browser", () => {
  beforeEach(() => {
    for (const fn of Object.values(handlers)) fn.mockClear();
  });

  it("asks before handing the captaincy over and does nothing until told to", () => {
    show(CAPTAIN);

    fireEvent.click(screen.getByLabelText(texts.makeCaptain("سالم ولد علي")));

    expect(screen.getByText(texts.confirmHandover("سالم ولد علي"))).toBeDefined();
    expect(handlers.onHandOver).not.toHaveBeenCalled();

    fireEvent.click(dialog().getByRole("button", { name: texts.makeCaptain("سالم ولد علي") }));
    expect(handlers.onHandOver).toHaveBeenCalledWith(PLAYER);
  });

  it("lets the captain back out of handing over", () => {
    show(CAPTAIN);

    fireEvent.click(screen.getByLabelText(texts.makeCaptain("سالم ولد علي")));
    fireEvent.click(dialog().getByText(confirmDialog.cancel));

    expect(screen.queryByText(texts.confirmHandover("سالم ولد علي"))).toBeNull();
    expect(handlers.onHandOver).not.toHaveBeenCalled();
  });

  it("asks before taking a player off the team", () => {
    show(CAPTAIN);

    fireEvent.click(screen.getByLabelText(texts.removePlayer("سالم ولد علي")));

    expect(screen.getByText(texts.confirmRemove("سالم ولد علي"))).toBeDefined();
    expect(handlers.onRemove).not.toHaveBeenCalled();

    fireEvent.click(dialog().getByRole("button", { name: texts.removePlayer("سالم ولد علي") }));
    expect(handlers.onRemove).toHaveBeenCalledWith(PLAYER);
  });

  it("takes a request off the team without asking, since nobody was ever on it", () => {
    cleanup();
    render(
      <MyTeamCard
        team={{
          ...team(),
          members: [
            { userId: CAPTAIN, fullName: "محمد ولد أحمد", photo: null, kind: "member" },
            { userId: PLAYER, fullName: "سالم ولد علي", photo: null, kind: "request" },
          ],
        }}
        candidates={[]}
        squad={{ min: null, max: null }}
        viewerId={CAPTAIN}
        locked={false}
        busy={false}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByLabelText(texts.declinePlayer("سالم ولد علي")));

    expect(handlers.onAnswerRequest).toHaveBeenCalledWith(PLAYER, false);
  });

  it("makes the captain type the team name before disbanding it", () => {
    show(CAPTAIN);

    fireEvent.click(screen.getByText(texts.disband));

    expect(screen.getByText(texts.confirmDisband)).toBeDefined();
    fireEvent.click(dialog().getByText(confirmDelete.proceed));

    const field = dialog().getByLabelText(texts.disbandNameField);
    const button = dialog().getByRole("button", { name: texts.disband });
    expect(button).toHaveProperty("disabled", true);

    fireEvent.change(field, { target: { value: "فريق الصقور" } });
    expect(button).toHaveProperty("disabled", false);

    fireEvent.click(button);
    expect(handlers.onDisband).toHaveBeenCalled();
  });

  it("refuses to disband on a name that does not match", () => {
    show(CAPTAIN);

    fireEvent.click(screen.getByText(texts.disband));
    fireEvent.click(dialog().getByText(confirmDelete.proceed));
    fireEvent.change(dialog().getByLabelText(texts.disbandNameField), {
      target: { value: "فريق النسور" },
    });

    expect(dialog().getByRole("button", { name: texts.disband })).toHaveProperty("disabled", true);
    expect(handlers.onDisband).not.toHaveBeenCalled();
  });
});

describe("a player leaving a team they do not lead", () => {
  beforeEach(() => {
    for (const fn of Object.values(handlers)) fn.mockClear();
  });

  it("asks before leaving", () => {
    show(PLAYER);

    fireEvent.click(screen.getByText(texts.leave));

    expect(screen.getByText(texts.confirmLeave)).toBeDefined();
    expect(handlers.onLeave).not.toHaveBeenCalled();

    fireEvent.click(dialog().getByRole("button", { name: texts.leave }));
    expect(handlers.onLeave).toHaveBeenCalled();
  });

  it("lets them back out", () => {
    show(PLAYER);

    fireEvent.click(screen.getByText(texts.leave));
    fireEvent.click(dialog().getByText(confirmDialog.cancel));

    expect(screen.queryByText(texts.confirmLeave)).toBeNull();
    expect(handlers.onLeave).not.toHaveBeenCalled();
  });

  it("offers nothing to leave once the tournament has started", () => {
    show(PLAYER, true);

    expect(screen.queryByText(texts.leave)).toBeNull();
  });
});
