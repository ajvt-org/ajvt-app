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
    fromHomeVillage: true,
    logo: null,
    captainUserId: null,
    groupId: null,
    group: null,
    members: members.map((m) => ({
      status: "ACTIVE" as const,
      member: {
        id: m.id,
        fullName: m.name,
        phone: "36000001",
        age: "البدريين",
        village: "التاكلالت",
        photo: null,
      },
    })),
  };
}

const TEAMS = [
  team("t1", "فريق النجم", [{ id: "p1", name: "أحمد ولد محمد" }]),
  team("t2", "فريق الأمل", [{ id: "p2", name: "بابا ولد سيدي" }]),
];

const SQUAD = [
  team("t1", "فريق النجم", [
    { id: "p1", name: "أحمد ولد محمد" },
    { id: "p2", name: "عبد الله ولد بابا" },
    { id: "p3", name: "يعقوب ولد سيدي" },
  ]),
  team("t2", "فريق الأمل", [{ id: "p4", name: "خالد ولد سالم" }]),
];

const PAIRS = [
  team("t1", "فريق النجم", [
    { id: "p1", name: "أحمد ولد محمد" },
    { id: "p2", name: "سالم ولد أحمد" },
  ]),
  team("t2", "فريق الأمل", [
    { id: "p3", name: "خالد ولد سالم" },
    { id: "p4", name: "بابا ولد سيدي" },
  ]),
];

const onChange = vi.fn();

function person(id: string, fullName: string): RosterMember {
  return {
    id,
    fullName,
    phone: "36000003",
    age: "البدريين",
    photo: null,
    team: null,
  };
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
      settings={{
        squad: { min: null, max: null },
        organisedByHomeVillage: false,
        outsidePlayerLimit: null,
      }}
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

  it("reports a failed request in place", async () => {
    del.mockRejectedValue(new Error("تعذر حذف الفريق"));
    show();

    fireEvent.click(screen.getAllByLabelText(/إزالة/)[0]);

    await waitFor(() => expect(screen.getByText("تعذر حذف الفريق")).toBeDefined());
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

  it("opens the card holding a match and shows only the players that match", () => {
    show(SQUAD);

    type("بابا");
    const cards = [...document.querySelectorAll("details")] as HTMLDetailsElement[];
    expect(cards).toHaveLength(1);
    expect(cards[0].open).toBe(true);
    expect(screen.getByText("عبد الله ولد بابا")).toBeDefined();
    expect(screen.queryByText("أحمد ولد محمد")).toBeNull();
    expect(screen.queryByText("يعقوب ولد سيدي")).toBeNull();
  });

  it("says on the card that it is showing a subset", () => {
    show(SQUAD);

    type("بابا");
    expect(screen.getByText("يظهر 1 من 3، البحث يخفي البقية")).toBeDefined();
  });

  it("keeps the count badge on the real roster, whatever is typed", () => {
    show(SQUAD);
    expect(screen.getByText("3 لاعبين")).toBeDefined();

    type("بابا");
    expect(screen.getByText("3 لاعبين")).toBeDefined();
  });

  it("leaves a team matched by its own name showing its whole roster, folded", () => {
    show(SQUAD);

    type("النجم");
    const cards = [...document.querySelectorAll("details")] as HTMLDetailsElement[];
    expect(cards).toHaveLength(1);
    expect(cards[0].open).toBe(false);
    expect(screen.queryByText(/يظهر/)).toBeNull();
  });

  it("lets the admin fold a card the search opened", () => {
    show(SQUAD);

    type("بابا");
    expect((document.querySelector("details") as HTMLDetailsElement).open).toBe(true);

    fireEvent.click(screen.getByText("فريق النجم"));
    expect((document.querySelector("details") as HTMLDetailsElement).open).toBe(false);
  });

  it("puts every card and every player back when the query is cleared", () => {
    show(SQUAD);

    type("بابا");
    type("");

    const cards = [...document.querySelectorAll("details")] as HTMLDetailsElement[];
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.open)).toEqual([false, false]);

    fireEvent.click(screen.getByText("فريق النجم"));
    for (const name of ["أحمد ولد محمد", "عبد الله ولد بابا", "يعقوب ولد سيدي"]) {
      expect(screen.getByText(name)).toBeDefined();
    }
    expect(screen.queryByText(/يظهر/)).toBeNull();
  });

  it("keeps a team the admin opened by hand open after a search is cleared", () => {
    show(SQUAD);

    fireEvent.click(screen.getByText("فريق الأمل"));
    type("بابا");
    type("");

    const cards = [...document.querySelectorAll("details")] as HTMLDetailsElement[];
    expect(cards.map((c) => c.open)).toEqual([false, true]);
  });
});

function tapWithTops(name: string, before: number, after: number) {
  const summary = screen.getByText(name).closest("summary") as HTMLElement;
  const tops = [before, after];
  summary.getBoundingClientRect = () => ({ top: tops.shift() ?? after }) as DOMRect;
  fireEvent.click(summary);
}

describe("the team the reader tapped stays where it is", () => {
  const scrollBy = vi.fn();

  beforeEach(() => {
    scrollBy.mockReset();
    window.scrollBy = scrollBy;
  });

  it("pulls the page back by what the card above it gave up", () => {
    show(SQUAD);
    fireEvent.click(screen.getByText("فريق النجم"));

    tapWithTops("فريق الأمل", 400, 100);

    expect(scrollBy).toHaveBeenCalledWith({ top: -300, behavior: "instant" });
  });

  it("does the same when a search has several teams open at once", () => {
    show(PAIRS);
    type("سالم");
    expect(cards().map((c) => c.open)).toEqual([true, true]);

    tapWithTops("فريق الأمل", 400, 260);

    expect(scrollBy).toHaveBeenCalledWith({ top: -140, behavior: "instant" });
  });

  it("leaves the page alone when nothing above the summary moved", () => {
    show(SQUAD);

    tapWithTops("فريق النجم", 120, 120);

    expect(scrollBy).not.toHaveBeenCalled();
  });
});

describe("the squad the tournament asks for", () => {
  function showSquad(squad: { min: number | null; max: number | null }, teams = SQUAD) {
    cleanup();
    render(
      <TeamsTab
        activityId="a1"
        teams={teams}
        settings={{ squad, organisedByHomeVillage: false, outsidePlayerLimit: null }}
        roster={[]}
        suspendedIds={[]}
        onChange={onChange}
      />,
    );
  }

  function isolated() {
    return [...document.querySelectorAll('span[dir="rtl"]')].map((el) => el.textContent);
  }

  it("says it once above the list rather than on every card", () => {
    showSquad({ min: 16, max: 22 });

    expect(screen.getByText(/حجم الفريق/)).toBeDefined();
    expect(document.body.textContent?.match(/16-22/g)).toHaveLength(1);
  });

  it("gives the range its own direction so the smaller number reads first", () => {
    showSquad({ min: 16, max: 22 });

    expect(isolated()).toEqual(["16-22"]);
    expect([...document.querySelectorAll("bdi")].map((el) => el.textContent)).toEqual(["16", "22"]);
  });

  it("leaves each card badge counting the players and nothing else", () => {
    showSquad({ min: 16, max: 22 });

    const summaries = [...document.querySelectorAll("summary")].map((s) => s.textContent);
    expect(summaries.some((text) => text?.includes("16-22"))).toBe(false);
    expect(summaries[0]).toContain("3 لاعبين");
  });

  it("states a fixed squad as the one number it is", () => {
    showSquad({ min: 11, max: 11 });

    expect(screen.getByText("حجم الفريق 11")).toBeDefined();
    expect(isolated()).toEqual([]);
  });

  it("stays quiet when the tournament sets no size", () => {
    showSquad({ min: null, max: null });

    expect(screen.queryByText(/حجم الفريق/)).toBeNull();
  });
});
