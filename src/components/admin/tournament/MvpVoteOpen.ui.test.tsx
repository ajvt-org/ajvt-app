import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import MvpVoteOpen from "./MvpVoteOpen";
import { mvpVote as texts } from "@/lib/texts";

const postMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { post: (...args: unknown[]) => postMock(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const ROSTER = [
  { id: "p1", fullName: "سالم" },
  { id: "p2", fullName: "عثمان" },
  { id: "p3", fullName: "خالد" },
];

function show(over: { played?: boolean; roster?: typeof ROSTER } = {}) {
  render(
    <MvpVoteOpen
      matchId="m1"
      played={over.played ?? true}
      roster={over.roster ?? ROSTER}
      defaultMinutes={90}
      onChange={vi.fn()}
    />,
  );
}

beforeEach(() => postMock.mockReset().mockResolvedValue({}));
afterEach(cleanup);

describe("MvpVoteOpen", () => {
  it("asks for the result before it offers a vote", () => {
    show({ played: false });

    expect(screen.getByText(texts.needsResult)).toBeDefined();
    expect(screen.queryByText(texts.pickCandidates)).toBeNull();
  });

  it("says so when there is nobody to stand", () => {
    show({ roster: [] });

    expect(screen.getByText(texts.needsRoster)).toBeDefined();
  });

  it("prefills the tournament duration and names it", () => {
    show();

    expect((screen.getByLabelText(texts.minutesLabel) as HTMLInputElement).value).toBe("90");
    expect(screen.getByText(texts.minutesHint(90))).toBeDefined();
  });

  it("will not open with fewer than two candidates", () => {
    show();

    fireEvent.click(screen.getByText("سالم"));

    expect(screen.getByText(texts.start(1)).closest("button")?.disabled).toBe(true);
  });

  it("sends the candidates and the minutes it was given", async () => {
    show();

    fireEvent.click(screen.getByText("سالم"));
    fireEvent.click(screen.getByText("خالد"));
    fireEvent.change(screen.getByLabelText(texts.minutesLabel), { target: { value: "15" } });
    fireEvent.click(screen.getByText(texts.start(2)));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toEqual({
      candidateMemberIds: ["p1", "p3"],
      minutes: 15,
    });
  });
});
