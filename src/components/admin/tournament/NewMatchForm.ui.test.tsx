import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewMatchForm from "./NewMatchForm";
import { matchAdmin as texts } from "@/lib/texts";
import type { Team } from "./types";

const post = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { post: (...args: unknown[]) => post(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const team = (id: string, groupId: string | null = null): Team => ({
  id,
  name: id,
  autoNamed: false,
  fromHomeVillage: true,
  logo: null,
  captainUserId: null,
  groupId,
  group: null,
  members: [],
});

const teams = [team("t1", "g1"), team("t2", "g1"), team("t3", "g2")];

const show = () => render(<NewMatchForm activityId="a1" teams={teams} onCreated={vi.fn()} />);

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({});
});

describe("NewMatchForm", () => {
  it("stays closed until the admin opens it", () => {
    const { container } = show();

    expect(container.querySelector("details")?.open).toBe(false);
    expect(screen.getByText(texts.newMatch)).toBeDefined();
  });

  it("says a match added here lands outside the day plan", () => {
    show();

    expect(screen.getByText(texts.newMatchOutsidePlan)).toBeDefined();
  });

  it("refuses to submit without both teams", async () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: texts.addMatch }));

    expect(await screen.findByText(texts.pickBothTeams)).toBeDefined();
    expect(post).not.toHaveBeenCalled();
  });

  it("offers only the home team's own group until the fixture is a knockout", () => {
    show();
    const [home, away] = screen.getAllByRole("combobox");

    fireEvent.change(home, { target: { value: "t1" } });
    expect(Array.from(away.querySelectorAll("option")).map((o) => o.value)).toEqual(["", "t2"]);

    fireEvent.click(screen.getByRole("checkbox"));
    expect(Array.from(away.querySelectorAll("option")).map((o) => o.value)).toEqual([
      "",
      "t2",
      "t3",
    ]);
  });

  it("posts the fixture and empties itself", async () => {
    show();
    const [home, away] = screen.getAllByRole("combobox");

    fireEvent.change(home, { target: { value: "t1" } });
    fireEvent.change(away, { target: { value: "t2" } });
    fireEvent.click(screen.getByRole("button", { name: texts.addMatch }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][0]).toBe("/api/admin/activities/a1/matches");
    expect(post.mock.calls[0][1]).toMatchObject({ homeTeamId: "t1", awayTeamId: "t2" });
    await waitFor(() => expect((home as HTMLSelectElement).value).toBe(""));
  });

  it("shows what the server refused", async () => {
    post.mockRejectedValue(new Error("لا يمكن إنشاء المباراة"));
    show();
    const [home, away] = screen.getAllByRole("combobox");

    fireEvent.change(home, { target: { value: "t1" } });
    fireEvent.change(away, { target: { value: "t2" } });
    fireEvent.click(screen.getByRole("button", { name: texts.addMatch }));

    expect(await screen.findByText("لا يمكن إنشاء المباراة")).toBeDefined();
  });
});
