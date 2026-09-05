import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import TeamCard from "./TeamCard";
import type { Team, TeamMemberEntry } from "./types";
import type { SquadBreach } from "@/lib/squadRules";
import { teamsTab } from "@/lib/texts";

function entry(id: string, name: string, status: "ACTIVE" | "PENDING" = "ACTIVE"): TeamMemberEntry {
  return {
    status,
    member: {
      id,
      fullName: name,
      phone: "36000001",
      age: "البدريين",
      village: "التاكلالت",
      photo: null,
    },
  };
}

function team(members: TeamMemberEntry[], captainUserId: string | null = null): Team {
  return {
    id: "team-1",
    name: "فريق النجم",
    autoNamed: false,
    fromHomeVillage: true,
    logo: null,
    captainUserId,
    groupId: null,
    group: null,
    members,
  };
}

const handlers = {
  onToggle: vi.fn(),
  onRenameTeam: vi.fn(),
  onDeleteTeam: vi.fn(),
  onSetLogo: vi.fn(),
  onSetCaptain: vi.fn(),
  onAddMember: vi.fn(),
  onApproveMember: vi.fn(),
  onRemoveMember: vi.fn(),
  onSetFromHomeVillage: vi.fn(),
};

function show(
  members: TeamMemberEntry[],
  squad: { min: number | null; max: number | null },
  captainUserId: string | null = null,
  open = true,
) {
  cleanup();
  render(
    <TeamCard
      team={team(members, captainUserId)}
      shownName="فريق النجم"
      settings={{ squad, organisedByHomeVillage: false, outsidePlayerLimit: null }}
      breaches={[]}
      members={members}
      open={open}
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

  it("counts the roster on its own, whether or not the tournament sets a size", () => {
    const players = [entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")];

    show(players, { min: 4, max: 4 });
    expect(screen.getByText("لاعبان")).toBeDefined();
    expect(screen.queryByText(/\//)).toBeNull();

    show(players, { min: null, max: null });
    expect(screen.getByText("لاعبان")).toBeDefined();
    expect(screen.queryByText(/\//)).toBeNull();
  });

  it("names every player on the roster", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")], { min: 2, max: 2 });

    expect(screen.getByText("أحمد ولد محمد")).toBeDefined();
    expect(screen.getByText("بابا ولد سيدي")).toBeDefined();
  });

  it("says how many players are waiting on approval", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي", "PENDING")], {
      min: 2,
      max: 2,
    });

    expect(screen.getByText("1 بانتظار الموافقة")).toBeDefined();
  });

  it("accepts and rejects a player who is waiting", () => {
    show([entry("p1", "أحمد ولد محمد", "PENDING")], { min: 1, max: 1 });

    fireEvent.click(screen.getByLabelText("قبول أحمد ولد محمد"));
    expect(handlers.onApproveMember).toHaveBeenCalledWith("p1");

    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    fireEvent.click(screen.getByLabelText("رفض أحمد ولد محمد"));
    expect(handlers.onRemoveMember).toHaveBeenCalledWith("p1");
  });

  it("removes a player who is on the roster", () => {
    show([entry("p1", "أحمد ولد محمد")], { min: 1, max: 1 });

    expect(screen.queryByLabelText("رفض أحمد ولد محمد")).toBeNull();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    fireEvent.click(screen.getByLabelText("إزالة أحمد ولد محمد"));
    expect(handlers.onRemoveMember).toHaveBeenCalledWith("p1");
  });

  it("carries one logo, the uploader, and names the team beside it", () => {
    show([entry("p1", "أحمد ولد محمد")], { min: 1, max: 1 });

    expect(screen.getByLabelText("تغيير شعار الفريق")).toBeDefined();
    expect(screen.queryByText("شعار الفريق")).toBeNull();
    expect(screen.queryByText("انقر على الصورة لتغييرها")).toBeNull();
    expect(screen.queryByText("اختياري، انقر لإضافة صورة")).toBeNull();
    expect(screen.getAllByText("فريق النجم").length).toBe(1);
  });

  it("hands the small logo to the stylesheet to drop once the card opens", () => {
    const { container } = render(
      <TeamCard
        team={team([entry("p1", "أحمد ولد محمد")])}
        shownName="فريق النجم"
        settings={{
          squad: { min: 1, max: 1 },
          organisedByHomeVillage: false,
          outsidePlayerLimit: null,
        }}
        breaches={[]}
        members={[entry("p1", "أحمد ولد محمد")]}
        open
        candidates={[]}
        suspendedIds={[]}
        busy={false}
        {...handlers}
      />,
    );

    expect(container.querySelectorAll(".summary-logo").length).toBe(1);
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("details[open] > .disclosure-summary .summary-logo");
  });

  it("sits the summary glyphs on the line the name sets", () => {
    const { container } = render(
      <TeamCard
        team={team([entry("p1", "أحمد ولد محمد")])}
        shownName="فريق النجم"
        settings={{
          squad: { min: 1, max: 1 },
          organisedByHomeVillage: false,
          outsidePlayerLimit: null,
        }}
        breaches={[]}
        members={[entry("p1", "أحمد ولد محمد")]}
        open
        candidates={[]}
        suspendedIds={[]}
        busy={false}
        {...handlers}
      />,
    );

    const head = container.querySelector(".disclosure-summary > div") as HTMLElement;
    expect(head.innerHTML).not.toContain("mt-2");
    for (const glyph of head.querySelectorAll(":scope > span")) {
      expect(glyph.className).toContain("h-6");
      expect(glyph.className).toContain("items-center");
    }
    const name = screen.getByText("فريق النجم");
    expect(name.className).toContain("leading-6");
    expect(name.className).toContain("optical-name");
  });

  it("renames the team from the card", () => {
    show([entry("p1", "أحمد ولد محمد")], { min: 1, max: 1 });

    fireEvent.click(screen.getByText("تعديل اسم الفريق"));
    fireEvent.change(screen.getByDisplayValue("فريق النجم"), {
      target: { value: "فريق الوحدة" },
    });
    fireEvent.click(screen.getByText("حفظ"));

    expect(handlers.onRenameTeam).toHaveBeenCalledWith("فريق الوحدة");
  });

  it("marks the captain once, on their own row", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")], { min: 2, max: 2 }, "p2");

    expect(screen.queryByText("القائد بابا ولد سيدي")).toBeNull();
    expect(screen.queryByText("القائد")).toBeNull();
    const marked = [...document.body.querySelectorAll<HTMLElement>("div")].filter((d) =>
      d.style.border.includes("copper"),
    );
    expect(marked.length).toBe(1);
    expect(marked[0].textContent).toContain("بابا ولد سيدي");
  });

  it("says nothing about a captain when the team has none", () => {
    show([entry("p1", "أحمد ولد محمد")], { min: 1, max: 1 });

    expect(screen.queryByText(/القائد/)).toBeNull();
    expect(screen.getByLabelText("اجعل أحمد ولد محمد قائد الفريق")).toBeDefined();
  });

  it("names a player captain and stands them down again", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")], { min: 2, max: 2 });

    fireEvent.click(screen.getByLabelText("اجعل بابا ولد سيدي قائد الفريق"));
    expect(handlers.onSetCaptain).toHaveBeenCalledWith("p2");

    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")], { min: 2, max: 2 }, "p2");
    fireEvent.click(screen.getByLabelText("إلغاء قيادة بابا ولد سيدي للفريق"));
    expect(handlers.onSetCaptain).toHaveBeenCalledWith(null);
  });

  it("says when the roster is still empty", () => {
    show([], { min: 4, max: 4 });

    expect(screen.getByText("لا يوجد لاعبون بعد")).toBeDefined();
    expect(screen.getByText("0 لاعب")).toBeDefined();
  });

  it("shows open or closed as it is told, and asks to be toggled", () => {
    show([entry("p1", "أحمد ولد محمد")], { min: 1, max: 1 }, null, false);
    expect((document.querySelector("details") as HTMLDetailsElement).open).toBe(false);

    fireEvent.click(screen.getByText("فريق النجم"));
    expect(handlers.onToggle).toHaveBeenCalled();

    show([entry("p1", "أحمد ولد محمد")], { min: 1, max: 1 }, null, true);
    expect((document.querySelector("details") as HTMLDetailsElement).open).toBe(true);
  });

  it("keeps the name, the count and the delete button in the closed summary", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي", "PENDING")], {
      min: 4,
      max: 4,
    });

    const summary = document.querySelector("summary") as HTMLElement;
    expect(summary.textContent).toContain("فريق النجم");
    expect(summary.textContent).toContain("لاعبان");
    expect(summary.textContent).toContain("1 بانتظار الموافقة");
    expect(summary.querySelector('[aria-label="حذف الفريق"]')).not.toBeNull();
  });

  it("deletes the team without opening the card", () => {
    show([entry("p1", "أحمد ولد محمد")], { min: 1, max: 1 }, null, false);

    const card = document.querySelector("details") as HTMLDetailsElement;
    fireEvent.click(screen.getByLabelText("حذف الفريق"));

    expect(handlers.onDeleteTeam).toHaveBeenCalled();
    expect(handlers.onToggle).not.toHaveBeenCalled();
    expect(card.open).toBe(false);
  });

  it("lets a long team name wrap instead of clipping it", () => {
    cleanup();
    render(
      <TeamCard
        team={team([entry("p1", "أحمد ولد محمد")])}
        shownName="فريق الحسن احمدو يحي البناني للشباب"
        settings={{
          squad: { min: 1, max: 1 },
          organisedByHomeVillage: false,
          outsidePlayerLimit: null,
        }}
        breaches={[]}
        members={[entry("p1", "أحمد ولد محمد")]}
        open
        candidates={[]}
        suspendedIds={[]}
        busy={false}
        {...handlers}
      />,
    );

    const name = screen.getByText("فريق الحسن احمدو يحي البناني للشباب");
    expect(name.className).not.toContain("truncate");
    expect(name.style.overflowWrap).toBe("anywhere");
  });
});

describe("a squad the admin should look at", () => {
  function withBreaches(breaches: SquadBreach[], members: TeamMemberEntry[]) {
    cleanup();
    render(
      <TeamCard
        team={team(members)}
        shownName="فريق النجم"
        settings={{
          squad: { min: 16, max: 22 },
          organisedByHomeVillage: true,
          outsidePlayerLimit: 4,
        }}
        breaches={breaches}
        members={members}
        open
        candidates={[]}
        suspendedIds={[]}
        busy={false}
        {...handlers}
      />,
    );
  }

  it("says a squad is short of the minimum", () => {
    withBreaches([{ kind: "tooFew", count: 15, min: 16 }], [entry("p1", "أحمد")]);

    expect(screen.getByText(teamsTab.squadShort)).toBeDefined();
  });

  it("says a squad is past the maximum", () => {
    withBreaches([{ kind: "tooMany", count: 23, max: 22 }], [entry("p1", "أحمد")]);

    expect(screen.getByText(teamsTab.squadOver)).toBeDefined();
  });

  it("says how many players come from outside and what the limit is", () => {
    withBreaches(
      [{ kind: "tooManyOutside", count: 5, limit: 4, overPlayerIds: ["p2"] }],
      [entry("p1", "أحمد"), entry("p2", "سالم")],
    );

    expect(screen.getByText(teamsTab.outsideOverLimit(5, 4))).toBeDefined();
  });

  it("marks the roster row that pushed the squad over", () => {
    withBreaches(
      [{ kind: "tooManyOutside", count: 5, limit: 4, overPlayerIds: ["p2"] }],
      [entry("p1", "أحمد"), entry("p2", "سالم")],
    );

    expect(screen.getAllByText(teamsTab.outsidePlayerOverLimit)).toHaveLength(1);
  });

  it("leaves a squad with nothing wrong unflagged", () => {
    withBreaches([], [entry("p1", "أحمد")]);

    expect(screen.queryByText(teamsTab.squadShort)).toBeNull();
    expect(screen.queryByText(teamsTab.outsidePlayerOverLimit)).toBeNull();
  });
});
