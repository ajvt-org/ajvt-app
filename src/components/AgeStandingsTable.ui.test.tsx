import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgeStandingsTable from "./AgeStandingsTable";
import type { AgeStanding } from "@/lib/ageStandings";

const standings: AgeStanding[] = [
  { rank: 1, name: "الكبير", members: 20, users: 22, total: 80, rate: 25, userRate: 28 },
  { rank: 2, name: "الصغير", members: 9, users: 10, total: 10, rate: 90, userRate: 100 },
  { rank: 3, name: "الوسط", members: 12, users: 30, total: 40, rate: 30, userRate: 75 },
];

function order() {
  return screen.getAllByText(/^(الكبير|الصغير|الوسط)$/).map((n) => n.textContent);
}

describe("the age leaderboard", () => {
  it("opens on the membership rate, so a small group that signed up nearly everyone leads", () => {
    render(<AgeStandingsTable standings={standings} />);
    expect(order()).toEqual(["الصغير", "الوسط", "الكبير"]);
  });

  it("reorders by member count when asked", async () => {
    render(<AgeStandingsTable standings={standings} />);
    await userEvent.selectOptions(screen.getByLabelText("الترتيب حسب"), "members");
    expect(order()).toEqual(["الكبير", "الوسط", "الصغير"]);
  });

  it("reorders by account count, which is a different order again", async () => {
    render(<AgeStandingsTable standings={standings} />);
    await userEvent.selectOptions(screen.getByLabelText("الترتيب حسب"), "users");
    expect(order()).toEqual(["الوسط", "الكبير", "الصغير"]);
  });

  it("reorders by the declared headcount", async () => {
    render(<AgeStandingsTable standings={standings} />);
    await userEvent.selectOptions(screen.getByLabelText("الترتيب حسب"), "total");
    expect(order()).toEqual(["الكبير", "الوسط", "الصغير"]);
  });

  it("renumbers the medals so the top of the chosen order is first", async () => {
    render(<AgeStandingsTable standings={standings} />);
    await userEvent.selectOptions(screen.getByLabelText("الترتيب حسب"), "members");
    const first = screen.getAllByText("الكبير")[0].closest(".card")!;
    expect(first.textContent).toContain("1");
  });

  it("shows accounts against the headcount once sorted by accounts", async () => {
    render(<AgeStandingsTable standings={standings} />);
    expect(screen.getByText("9 / 10")).toBeDefined();
    await userEvent.selectOptions(screen.getByLabelText("الترتيب حسب"), "users");
    expect(screen.getByText("10 / 10")).toBeDefined();
  });

  it("marks the reader's own group whatever the order", async () => {
    render(<AgeStandingsTable standings={standings} mine="الوسط" />);
    expect(screen.getByText("عصرك")).toBeDefined();
    await userEvent.selectOptions(screen.getByLabelText("الترتيب حسب"), "users");
    expect(screen.getByText("عصرك")).toBeDefined();
  });
});
