import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import TeamCard from "./TeamCard";
import type { Team, TeamMemberEntry } from "./types";

function entry(id: string, name: string, status: "ACTIVE" | "PENDING" = "ACTIVE"): TeamMemberEntry {
  return {
    status,
    member: { id, fullName: name, phone: "36000001", age: "البدريين", photo: null },
  };
}

function team(members: TeamMemberEntry[], captainUserId: string | null = null): Team {
  return {
    id: "team-1",
    name: "فريق النجم",
    autoNamed: false,
    logo: null,
    captainUserId,
    groupId: null,
    group: null,
    members,
  };
}

const handlers = {
  onRenameTeam: vi.fn(),
  onDeleteTeam: vi.fn(),
  onSetLogo: vi.fn(),
  onSetCaptain: vi.fn(),
  onAddMember: vi.fn(),
  onApproveMember: vi.fn(),
  onRemoveMember: vi.fn(),
};

function show(
  members: TeamMemberEntry[],
  teamSize: number | null,
  captainUserId: string | null = null,
) {
  cleanup();
  render(
    <TeamCard
      team={team(members, captainUserId)}
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

  it("carries one logo, the uploader, and names the team beside it", () => {
    show([entry("p1", "أحمد ولد محمد")], 1);

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
        teamSize={1}
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
        teamSize={1}
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
    show([entry("p1", "أحمد ولد محمد")], 1);

    fireEvent.click(screen.getByText("تعديل اسم الفريق"));
    fireEvent.change(screen.getByDisplayValue("فريق النجم"), {
      target: { value: "فريق الوحدة" },
    });
    fireEvent.click(screen.getByText("حفظ"));

    expect(handlers.onRenameTeam).toHaveBeenCalledWith("فريق الوحدة");
  });

  it("marks the captain once, on their own row", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")], 2, "p2");

    expect(screen.queryByText("القائد بابا ولد سيدي")).toBeNull();
    expect(screen.queryByText("القائد")).toBeNull();
    const marked = [...document.body.querySelectorAll<HTMLElement>("div")].filter((d) =>
      d.style.border.includes("copper"),
    );
    expect(marked.length).toBe(1);
    expect(marked[0].textContent).toContain("بابا ولد سيدي");
  });

  it("says nothing about a captain when the team has none", () => {
    show([entry("p1", "أحمد ولد محمد")], 1);

    expect(screen.queryByText(/القائد/)).toBeNull();
    expect(screen.getByLabelText("اجعل أحمد ولد محمد قائد الفريق")).toBeDefined();
  });

  it("names a player captain and stands them down again", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")], 2);

    fireEvent.click(screen.getByLabelText("اجعل بابا ولد سيدي قائد الفريق"));
    expect(handlers.onSetCaptain).toHaveBeenCalledWith("p2");

    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي")], 2, "p2");
    fireEvent.click(screen.getByLabelText("إلغاء قيادة بابا ولد سيدي للفريق"));
    expect(handlers.onSetCaptain).toHaveBeenCalledWith(null);
  });

  it("says when the roster is still empty", () => {
    show([], 4);

    expect(screen.getByText("لا يوجد لاعبون بعد")).toBeDefined();
    expect(screen.getByText("0 / 4")).toBeDefined();
  });

  it("starts closed and opens on the summary", () => {
    show([entry("p1", "أحمد ولد محمد")], 1);

    const card = document.querySelector("details") as HTMLDetailsElement;
    expect(card.open).toBe(false);

    fireEvent.click(screen.getByText("فريق النجم"));
    expect(card.open).toBe(true);
  });

  it("keeps the name, the count and the delete button in the closed summary", () => {
    show([entry("p1", "أحمد ولد محمد"), entry("p2", "بابا ولد سيدي", "PENDING")], 4);

    const summary = document.querySelector("summary") as HTMLElement;
    expect(summary.textContent).toContain("فريق النجم");
    expect(summary.textContent).toContain("2 / 4");
    expect(summary.textContent).toContain("1 بانتظار الموافقة");
    expect(summary.querySelector('[aria-label="حذف الفريق"]')).not.toBeNull();
  });

  it("deletes the team without opening the card", () => {
    show([entry("p1", "أحمد ولد محمد")], 1);

    const card = document.querySelector("details") as HTMLDetailsElement;
    fireEvent.click(screen.getByLabelText("حذف الفريق"));

    expect(handlers.onDeleteTeam).toHaveBeenCalled();
    expect(card.open).toBe(false);
  });

  it("lets a long team name wrap instead of clipping it", () => {
    cleanup();
    render(
      <TeamCard
        team={team([entry("p1", "أحمد ولد محمد")])}
        shownName="فريق الحسن احمدو يحي البناني للشباب"
        teamSize={1}
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
