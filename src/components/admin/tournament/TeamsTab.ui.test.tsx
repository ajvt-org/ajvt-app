import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import TeamsTab from "./TeamsTab";
import type { RosterMember, Team } from "./types";

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

function team(id: string, name: string, members: { id: string; name: string }[]): Team {
  return {
    id,
    name,
    autoNamed: false,
    logo: null,
    captainUserId: null,
    groupId: null,
    group: null,
    members: members.map((m) => ({
      status: "ACTIVE" as const,
      member: { id: m.id, fullName: m.name, phone: "36000001", age: "البدريين", photo: null },
    })),
  };
}

const TEAMS = [
  team("t1", "فريق النجم", [{ id: "p1", name: "أحمد ولد محمد" }]),
  team("t2", "فريق الأمل", [{ id: "p2", name: "بابا ولد سيدي" }]),
];

const onChange = vi.fn();

function show(teams: Team[] = TEAMS, roster: RosterMember[] = []) {
  cleanup();
  render(
    <TeamsTab
      activityId="a1"
      teams={teams}
      teamSize={null}
      roster={roster}
      suspendedIds={[]}
      onChange={onChange}
    />,
  );
}

function cards() {
  return [...document.querySelectorAll("details")] as HTMLDetailsElement[];
}

describe("TeamsTab", () => {
  beforeEach(() => {
    for (const fn of [post, patch, del, onChange]) fn.mockReset();
  });

  it("starts with every card folded", () => {
    show();

    expect(cards().map((c) => c.open)).toEqual([false, false]);
  });

  it("folds the first team when a second is opened", () => {
    show();

    fireEvent.click(screen.getByText("فريق النجم"));
    expect(cards().map((c) => c.open)).toEqual([true, false]);

    fireEvent.click(screen.getByText("فريق الأمل"));
    expect(cards().map((c) => c.open)).toEqual([false, true]);
  });

  it("closes the open team when it is hit again", () => {
    show();

    fireEvent.click(screen.getByText("فريق النجم"));
    fireEvent.click(screen.getByText("فريق النجم"));
    expect(cards().map((c) => c.open)).toEqual([false, false]);
  });

  it("leaves the card open when the admin acts on a player inside it", async () => {
    del.mockResolvedValue({});
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    show();

    fireEvent.click(screen.getByText("فريق النجم"));
    fireEvent.click(screen.getByLabelText("إزالة أحمد ولد محمد"));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(cards().map((c) => c.open)).toEqual([true, false]);
  });
});
