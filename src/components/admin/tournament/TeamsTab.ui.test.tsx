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

function person(id: string, fullName: string): RosterMember {
  return { id, fullName, phone: "36000003", age: "البدريين", photo: null, team: null };
}

function search() {
  return screen.getByLabelText("البحث في الفرق واللاعبين");
}

function type(value: string) {
  fireEvent.change(search(), { target: { value } });
}

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

  it("finds a team by its own name and by a player it holds", () => {
    show();

    type("الأمل");
    expect(screen.getByText("فريق الأمل")).toBeDefined();
    expect(screen.queryByText("فريق النجم")).toBeNull();

    type("أحمد");
    expect(screen.getByText("فريق النجم")).toBeDefined();
    expect(screen.queryByText("فريق الأمل")).toBeNull();
  });

  it("still matches once the hamza and the ta marbuta are folded", () => {
    show();

    type("احمد");
    expect(screen.getByText("فريق النجم")).toBeDefined();
  });

  it("says how many of how many are showing, and goes quiet again when cleared", () => {
    show();

    expect(screen.getByText("عدد الفرق: 2")).toBeDefined();

    type("الأمل");
    expect(screen.getByText("عدد الفرق: 1 من 2")).toBeDefined();

    type("");
    expect(screen.getByText("عدد الفرق: 2")).toBeDefined();
    expect(screen.getByText("فريق النجم")).toBeDefined();
    expect(screen.getByText("فريق الأمل")).toBeDefined();
  });

  it("gives an empty result a line of its own rather than a blank tab", () => {
    show();

    type("زينب");
    expect(screen.getByText("لا فريق ولا لاعب بهذا الاسم")).toBeDefined();
    expect(document.querySelectorAll("details")).toHaveLength(0);
  });

  it("puts the unassigned through the same query", () => {
    show(TEAMS, [person("u1", "زينب بنت أحمد"), person("u2", "خديجة بنت سالم")]);

    expect(screen.getByText("زينب بنت أحمد")).toBeDefined();
    expect(screen.getByText("خديجة بنت سالم")).toBeDefined();

    type("خديجة");
    expect(screen.queryByText("زينب بنت أحمد")).toBeNull();
    expect(screen.getByText("خديجة بنت سالم")).toBeDefined();
    expect(screen.queryByText("لا فريق ولا لاعب بهذا الاسم")).toBeNull();
  });

  it("still offers every unassigned player to add, whatever is typed", () => {
    show(TEAMS, [person("u1", "زينب بنت أحمد"), person("u2", "خديجة بنت سالم")]);

    type("أحمد");
    expect(screen.queryByText("خديجة بنت سالم")).toBeNull();

    fireEvent.click(screen.getByText("فريق النجم"));
    fireEvent.click(screen.getByText("إضافة لاعب"));
    const options = [...document.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("زينب بنت أحمد");
    expect(options).toContain("خديجة بنت سالم");
  });
});
