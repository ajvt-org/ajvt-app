import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import SetupWizard from "./SetupWizard";
import { setupWizard as texts } from "@/lib/texts";

const post = vi.fn();
const showToast = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { post: (...args: unknown[]) => post(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

vi.mock("@/components/Toast", () => ({ useToast: () => showToast }));

const teams = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `فريق ${i + 1}` }));

function open(teamCount: number, playedCount = 0) {
  return render(
    <SetupWizard
      activityId="a1"
      teams={teams(teamCount)}
      playedCount={playedCount}
      onDone={() => {}}
      onClose={() => {}}
    />,
  );
}

const next = () => fireEvent.click(screen.getByRole("button", { name: texts.next }));

const drawnTeams = () =>
  screen.getAllByRole("button", { name: /^فريق / }).map((b) => b.textContent ?? "");

function firstOfEachOfTwoGroups(): [string, string] {
  const groups = screen
    .getAllByText(/^المجموعة /)
    .map((heading) => heading.parentElement as HTMLElement)
    .map((card) => within(card).getAllByRole("button", { name: /^فريق / })[0].textContent ?? "");
  return [groups[0], groups[1]];
}

describe("the setup wizard", () => {
  beforeEach(() => {
    cleanup();
    post.mockReset();
    post.mockResolvedValue({ ok: true });
    showToast.mockReset();
  });

  it("refuses to run once a match has been played", () => {
    open(12, 3);

    expect(screen.getByText(texts.hasResults(3))).toBeTruthy();
    expect(screen.queryByRole("button", { name: texts.next })).toBeNull();
  });

  it("refuses to run with fewer than two teams", () => {
    open(1);

    expect(screen.getByText(texts.tooFewTeams)).toBeTruthy();
  });

  it("opens on the shape and cannot move on until one is chosen", () => {
    open(12);

    expect(screen.getByText(texts.stepOf(1, 5), { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: texts.next })).toHaveProperty("disabled", true);
  });

  it("does not offer a straight knockout for twelve teams", () => {
    open(12);

    expect(screen.getByRole("button", { name: /إقصاء مباشر/ })).toHaveProperty("disabled", true);
    expect(screen.getByText(texts.knockoutRefused(12, 8, 16))).toBeTruthy();
  });

  it("offers only the group counts that lead somewhere", () => {
    open(12);
    fireEvent.click(screen.getByRole("button", { name: /مجموعات ثم إقصاء/ }));

    const options = within(screen.getByLabelText(texts.groupCountLabel)).getAllByRole("option");
    const values = options.map((o) => (o as HTMLOptionElement).value).filter(Boolean);

    expect(values).toEqual(["2", "4"]);
  });

  it("offers only the qualifier counts the groups divide", () => {
    open(12);
    fireEvent.click(screen.getByRole("button", { name: /مجموعات ثم إقصاء/ }));
    fireEvent.change(screen.getByLabelText(texts.groupCountLabel), { target: { value: "4" } });

    const options = within(screen.getByLabelText(texts.qualifierCountLabel)).getAllByRole("option");
    const values = options.map((o) => (o as HTMLOptionElement).value).filter(Boolean);

    expect(values).toEqual(["4", "8"]);
  });

  it("walks a straight knockout past the groups", () => {
    open(8);
    fireEvent.click(screen.getByRole("button", { name: /إقصاء مباشر/ }));

    expect(screen.getByText(texts.stepOf(1, 3), { exact: false })).toBeTruthy();
    next();

    expect(screen.getByText(texts.bracketTitle)).toBeTruthy();
  });

  it("proposes an even draw and lets a swap move a team", () => {
    open(12);
    fireEvent.click(screen.getByRole("button", { name: /مجموعات ثم إقصاء/ }));
    fireEvent.change(screen.getByLabelText(texts.groupCountLabel), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText(texts.qualifierCountLabel), { target: { value: "8" } });
    next();

    expect(screen.getByText(texts.drawTitle)).toBeTruthy();
    const before = drawnTeams();
    const [first, second] = firstOfEachOfTwoGroups();
    fireEvent.click(screen.getByRole("button", { name: first }));

    expect(screen.getByText(texts.swapWith)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: second }));

    const after = drawnTeams();
    expect(after).not.toEqual(before);
    expect([...after].sort()).toEqual([...before].sort());
    expect(after.indexOf(first)).toBe(before.indexOf(second));
  });

  it("shows the qualifier slots rather than teams in the bracket", () => {
    open(8);
    fireEvent.click(screen.getByRole("button", { name: /مجموعات ثم إقصاء/ }));
    fireEvent.change(screen.getByLabelText(texts.groupCountLabel), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(texts.qualifierCountLabel), { target: { value: "4" } });
    next();
    next();
    next();

    expect(screen.getByText(texts.bracketHint)).toBeTruthy();
    expect(screen.queryByText("فريق 1")).toBeNull();
  });

  it("holds at the dates until a first day is given, then writes it all", async () => {
    open(8);
    fireEvent.click(screen.getByRole("button", { name: /إقصاء مباشر/ }));
    next();
    next();

    const write = screen.getByRole("button", { name: texts.write });
    expect(write).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByLabelText(texts.firstDay), { target: { value: "2026-09-20" } });
    fireEvent.click(screen.getByRole("button", { name: texts.write }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][0]).toBe("/api/admin/activities/a1/tournament-setup");
    expect(post.mock.calls[0][1]).toMatchObject({ format: "KNOCKOUT", groups: [] });
    expect(showToast).toHaveBeenCalledWith(texts.done);
  });

  it("sends the draw it was shown", async () => {
    open(8);
    fireEvent.click(screen.getByRole("button", { name: /مجموعات ثم إقصاء/ }));
    fireEvent.change(screen.getByLabelText(texts.groupCountLabel), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(texts.qualifierCountLabel), { target: { value: "4" } });
    next();
    next();
    next();
    next();
    fireEvent.change(screen.getByLabelText(texts.firstDay), { target: { value: "2026-09-20" } });
    fireEvent.click(screen.getByRole("button", { name: texts.write }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    const body = post.mock.calls[0][1] as {
      groups: { teamIds: string[] }[];
      qualifierCount: number;
    };
    expect(body.groups).toHaveLength(2);
    expect(body.groups.flatMap((g) => g.teamIds).sort()).toEqual(
      teams(8)
        .map((t) => t.id)
        .sort(),
    );
    expect(body.qualifierCount).toBe(4);
  });

  it("goes back the way it came", () => {
    open(8);
    fireEvent.click(screen.getByRole("button", { name: /إقصاء مباشر/ }));
    next();
    fireEvent.click(screen.getByRole("button", { name: texts.back }));

    expect(screen.getByText(texts.formatLabel)).toBeTruthy();
  });

  it("says what went wrong when the write is refused", async () => {
    post.mockRejectedValue(new Error("لا يمكن إعادة ترتيب بطولة"));
    open(8);
    fireEvent.click(screen.getByRole("button", { name: /إقصاء مباشر/ }));
    next();
    next();
    fireEvent.change(screen.getByLabelText(texts.firstDay), { target: { value: "2026-09-20" } });
    fireEvent.click(screen.getByRole("button", { name: texts.write }));

    await waitFor(() => expect(screen.getByText("لا يمكن إعادة ترتيب بطولة")).toBeTruthy());
  });
});
