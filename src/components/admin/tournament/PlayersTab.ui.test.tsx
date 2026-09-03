import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import PlayersTab from "./PlayersTab";
import type { RosterMember, Team } from "./types";
import { playersTab as texts } from "@/lib/texts";

const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    del: (...args: unknown[]) => del(...args),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

function player(id: string, name: string, status: "ACTIVE" | "PENDING" = "ACTIVE"): Team {
  return {
    id: `team-${id}`,
    name: `لاعب ${id}`,
    autoNamed: true,
    logo: null,
    captainUserId: null,
    groupId: null,
    group: null,
    members: [
      { status, member: { id, fullName: name, phone: "36000001", age: "البدريين", photo: null } },
    ],
  };
}

function rosterMember(id: string, name: string, inTeam: boolean): RosterMember {
  return {
    id,
    fullName: name,
    phone: "36000002",
    age: "البدريين",
    photo: null,
    team: inTeam ? { id: "team-x", name: "x" } : null,
  };
}

function show(teams: Team[], roster: RosterMember[]) {
  cleanup();
  const onChange = vi.fn();
  render(<PlayersTab activityId="a1" teams={teams} roster={roster} onChange={onChange} />);
  return onChange;
}

describe("PlayersTab", () => {
  beforeEach(() => {
    post.mockReset();
    patch.mockReset();
    del.mockReset();
  });

  it("never says team, players all the way", () => {
    show([player("p1", "أحمد ولد محمد")], []);

    expect(screen.getByText(/اللاعبون/)).toBeDefined();
    expect(screen.getByText("أحمد ولد محمد")).toBeDefined();
    expect(screen.queryByText(/اسم الفريق/)).toBeNull();
  });

  it("adds a player in one action, seating them in an auto-named entry", async () => {
    post.mockResolvedValueOnce({ team: { id: "team-new" } }).mockResolvedValueOnce({});
    const onChange = show([], [rosterMember("p9", "سالم ولد علي", false)]);

    fireEvent.change(screen.getByLabelText("اختيار اللاعب"), { target: { value: "p9" } });
    fireEvent.click(screen.getByText("إضافة"));

    await waitFor(() => {
      expect(post).toHaveBeenNthCalledWith(1, "/api/admin/activities/a1/teams", {
        name: "",
        logo: null,
      });
      expect(post).toHaveBeenNthCalledWith(2, "/api/admin/teams/team-new/members", {
        userId: "p9",
      });
      expect(onChange).toHaveBeenCalled();
    });
  });

  it("approves a self-service join request", async () => {
    patch.mockResolvedValue({});
    show([player("p2", "عمر ولد سيدي", "PENDING")], []);

    fireEvent.click(screen.getByText("قبول الانضمام"));

    await waitFor(() => expect(patch).toHaveBeenCalledWith("/api/admin/teams/team-p2/members/p2"));
  });

  it("asks before removing a player", async () => {
    del.mockResolvedValue({});
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    show([player("p1", "أحمد ولد محمد")], []);

    fireEvent.click(screen.getByLabelText("إزالة أحمد ولد محمد"));

    expect(del).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("finds a candidate whose name is written with a different hamza", () => {
    show([], [rosterMember("u1", "أحمد ولد محمد", false)]);

    fireEvent.change(screen.getByPlaceholderText(texts.searchPlaceholder), {
      target: { value: "احمد" },
    });

    const options = [...document.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("أحمد ولد محمد");
  });

  it("still finds a candidate by phone", () => {
    show([], [rosterMember("u1", "أحمد ولد محمد", false)]);

    fireEvent.change(screen.getByPlaceholderText(texts.searchPlaceholder), {
      target: { value: "36000002" },
    });

    const options = [...document.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("أحمد ولد محمد");
  });
});
