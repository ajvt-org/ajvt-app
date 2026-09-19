import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import { usePendingCounts } from "./usePendingCounts";
import { announceChange, forgetDataListeners } from "@/lib/dataChanged";

function reply(counts: { members?: number; activityWork?: number; donations?: number }) {
  return {
    ok: true,
    json: async () => ({
      pendingMembers: counts.members ?? 0,
      pendingActivityWork: counts.activityWork ?? 0,
      pendingDonations: counts.donations ?? 0,
    }),
  };
}

function Badges({ enabled = true }: { enabled?: boolean }) {
  const pending = usePendingCounts(enabled);
  return <span data-testid="counts">{`${pending.members}/${pending.activityWork}`}</span>;
}

const shown = () => screen.getByTestId("counts").textContent;

afterEach(() => {
  cleanup();
  forgetDataListeners();
  vi.unstubAllGlobals();
});

describe("the counts on the admin nav", () => {
  it("reads them when the shell opens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ members: 3, activityWork: 1 })));
    render(<Badges />);

    await waitFor(() => expect(shown()).toBe("3/1"));
  });

  it("reads them again when a change lands, without the page being reloaded", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply({ members: 3 }))
      .mockResolvedValueOnce(reply({ members: 2 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Badges />);
    await waitFor(() => expect(shown()).toBe("3/0"));

    act(() => announceChange());

    await waitFor(() => expect(shown()).toBe("2/0"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("asks the summary route for them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({}));
    vi.stubGlobal("fetch", fetchMock);
    render(<Badges />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/notifications/summary"));
  });

  it("reads nothing on the login page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({ members: 3 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Badges enabled={false} />);

    act(() => announceChange());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(shown()).toBe("0/0");
  });

  it("keeps the counts it has when the route refuses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply({ members: 3 }))
      .mockResolvedValueOnce({ ok: false, json: async () => null });
    vi.stubGlobal("fetch", fetchMock);
    render(<Badges />);
    await waitFor(() => expect(shown()).toBe("3/0"));

    act(() => announceChange());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(shown()).toBe("3/0");
  });
});
