import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ProofCard from "./ProofCard";
import type { Proof } from "./paymentTypes";

const REUSE = [{ kind: "member", id: "m9", label: "أحمد", date: "2026-08-01T00:00:00.000Z" }];

function mockFetch(reuse: unknown[] = REUSE) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ reuse }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function proofOf(over: Partial<Proof> = {}): Proof {
  return {
    id: "d1",
    kind: "DONATION",
    proof: "same.webp",
    memberName: "محمد",
    activityTitle: null,
    amount: 500,
    status: "PENDING",
    source: "PUBLIC",
    uploadedAt: "2026-08-20T09:00:00.000Z",
    submittedAt: "2026-08-20T09:00:00.000Z",
    ...over,
  };
}

function show(over: Partial<Proof> = {}) {
  render(
    <ProofCard
      proof={proofOf(over)}
      members={[]}
      activities={[]}
      financeTags={[]}
      busy={false}
      onReview={vi.fn()}
      onDelete={vi.fn()}
      onLink={vi.fn()}
      onPatch={vi.fn()}
    />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("a donation being reviewed", () => {
  it("warns that the screenshot has been sent before", async () => {
    mockFetch();
    show();

    expect(await screen.findByText(/نفس الكابتير مستعمل من قبل/)).toBeTruthy();
    expect(screen.getByText("أحمد")).toBeTruthy();
  });

  it("asks about the donation itself, so it is left out of its own answer", async () => {
    const fetchMock = mockFetch();
    show();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("filename=same.webp");
    expect(url).toContain("kind=donation");
    expect(url).toContain("id=d1");
  });

  it("says nothing when the screenshot is used once", async () => {
    mockFetch([]);
    show();

    await waitFor(() => expect(screen.queryByText(/مستعمل من قبل/)).toBeNull());
  });
});

describe("the other kinds on the same list", () => {
  it("asks about a membership proof as a member", async () => {
    const fetchMock = mockFetch();
    show({ id: "m1", kind: "MEMBERSHIP", amount: null });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain("kind=member");
  });

  it("leaves an activity registration alone, which the check does not cover", async () => {
    const fetchMock = mockFetch();
    show({ id: "r1", kind: "ACTIVITY", activityTitle: "الدوري", amount: null });

    await waitFor(() => expect(screen.getByText("الدوري")).toBeTruthy());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
