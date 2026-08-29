import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import MvpVoteResults from "./MvpVoteResults";
import { mvpVote as texts } from "@/lib/texts";
import type { MvpVote } from "./types";

const patchMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    patch: (...args: unknown[]) => patchMock(...args),
    del: vi.fn(),
  },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const candidate = (id: string, fullName: string, votes: number) => ({
  id,
  memberId: `m-${id}`,
  member: { id: `m-${id}`, fullName },
  _count: { votes },
});

function vote(over: Partial<MvpVote> = {}): MvpVote {
  return {
    id: "v1",
    status: "OPEN",
    closesAt: new Date(Date.now() + 45 * 60_000).toISOString(),
    candidates: [candidate("c1", "سالم", 3), candidate("c2", "خالد", 1)],
    ...over,
  };
}

function show(over: Partial<MvpVote> = {}) {
  render(<MvpVoteResults matchId="m1" vote={vote(over)} defaultMinutes={90} onChange={vi.fn()} />);
}

beforeEach(() => patchMock.mockReset().mockResolvedValue({}));
afterEach(cleanup);

describe("MvpVoteResults", () => {
  it("shows the time left while the window is open", () => {
    show();

    expect(screen.getByText(texts.open)).toBeDefined();
    expect(screen.getByText(texts.closesIn("45 دقيقة"))).toBeDefined();
  });

  it("reads as closed once the deadline has passed, with no admin action", () => {
    show({ closesAt: new Date(Date.now() - 1000).toISOString() });

    expect(screen.getByText(texts.closed)).toBeDefined();
    expect(screen.queryByText(/يغلق بعد/)).toBeNull();
  });

  it("offers to reopen a vote the clock closed", () => {
    show({ closesAt: new Date(Date.now() - 1000).toISOString() });

    expect(screen.getByText(texts.reopen)).toBeDefined();
  });

  it("extends by the tournament duration", async () => {
    show();

    fireEvent.click(screen.getByText(texts.extend));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(patchMock.mock.calls[0][1]).toEqual({ minutes: 90 });
  });

  it("warns that a tie needs a manual pick", () => {
    show({
      closesAt: new Date(Date.now() - 1000).toISOString(),
      candidates: [candidate("c1", "سالم", 2), candidate("c2", "خالد", 2)],
    });

    expect(screen.getByText(texts.tie)).toBeDefined();
  });

  it("says nothing about a tie when there is a clear leader", () => {
    show({ closesAt: new Date(Date.now() - 1000).toISOString() });

    expect(screen.queryByText(texts.tie)).toBeNull();
  });

  it("adds the ballots up", () => {
    show();

    expect(screen.getByText(texts.totalVotes(4))).toBeDefined();
  });
});
