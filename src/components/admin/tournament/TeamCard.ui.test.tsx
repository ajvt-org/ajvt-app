import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import TeamCard from "./TeamCard";
import type { Team, TeamMemberEntry } from "./types";

function entry(id: string, name: string, status: "ACTIVE" | "PENDING" = "ACTIVE"): TeamMemberEntry {
  return {
    status,
    member: { id, fullName: name, phone: "36000001", age: "البدريين", photo: null },
  };
}

function team(members: TeamMemberEntry[]): Team {
  return {
    id: "team-1",
    name: "فريق النجم",
    autoNamed: false,
    logo: null,
    groupId: null,
    group: null,
    members,
  };
}

const handlers = {
  onRenameTeam: vi.fn(),
  onDeleteTeam: vi.fn(),
  onSetLogo: vi.fn(),
  onRenameMember: vi.fn(),
  onAddMember: vi.fn(),
  onApproveMember: vi.fn(),
  onRemoveMember: vi.fn(),
};

function show(members: TeamMemberEntry[], teamSize: number | null) {
  cleanup();
  render(
    <TeamCard
      team={team(members)}
      shownName="فريق النجم"
      teamSize={teamSize}
      candidates={[]}
      suspendedIds={[]}
      busy={false}
      {...handlers}
    />,
  );
}

describe("TeamCard", () => {
  beforeEach(() => {
    for (const fn of Object.values(handlers)) fn.mockReset();
  });

  it("counts the roster against the required size", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")], 4);

    expect(screen.getByText("2 / 4")).toBeDefined();
  });

  it("counts the roster on its own when the tournament sets no size", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")], null);

    expect(screen.queryByText(/\//)).toBeNull();
    expect(screen.getByText("لاعبان")).toBeDefined();
  });

  it("names every player on the roster", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")], 2);

    expect(screen.getByText("أحمد ولد محمد")).toBeDefined();
    expect(screen.getByText("بابا ولد سيدي")).toBeDefined();
  });

  it("says how many players are waiting on approval", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي", "PENDING")], 2);

    expect(screen.getByText("1 بانتظار الموافقة")).toBeDefined();
  });

  it("accepts and rejects a player who is waiting", () => {
    show([entry("p1", "أحمد ولد محمد", "PENDING")], 1);

    fireEvent.click(screen.getByLabelText("قبول أحمد ولد محمد"));
    expect(handlers.onApproveMember).toHaveBeenCalledWith("p1");

    fireEvent.click(screen.getByLabelText("رفض أحمد ولد محمد"));
    expect(handlers.onRemoveMember).toHaveBeenCalledWith("p1");
  });

  it("removes a player who is on the roster", () => {
    show([entry("p1", "أحمد ولد محمد")], 1);

    expect(screen.queryByLabelText("رفض أحمد ولد محمد")).toBeNull();
    fireEvent.click(screen.getByLabelText("إزالة أحمد ولد محمد"));
    expect(handlers.onRemoveMember).toHaveBeenCalledWith("p1");
  });

  it("renames the team from the card", () => {
    show([entry("p1", "أحمد ولد محمد")], 1);

    fireEvent.click(screen.getByLabelText("تعديل اسم الفريق"));
    fireEvent.change(screen.getByDisplayValue("فريق النجم"), {
      target: { value: "فريق الوحدة" },
    });
    fireEvent.click(screen.getByText("حفظ"));

    expect(handlers.onRenameTeam).toHaveBeenCalledWith("فريق الوحدة");
  });

  it("says when the roster is still empty", () => {
    show([], 4);

    expect(screen.getByText("لا يوجد لاعبون بعد")).toBeDefined();
    expect(screen.getByText("0 / 4")).toBeDefined();
  });
});
