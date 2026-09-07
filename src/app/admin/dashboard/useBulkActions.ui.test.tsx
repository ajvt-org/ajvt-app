import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBulkActions } from "./useBulkActions";
import { bulkReview as texts } from "@/lib/texts";

function stubFetch(...outcomes: boolean[]) {
  let call = 0;
  const fetchMock = vi.fn().mockImplementation(async () => {
    const ok = outcomes[call++] ?? true;
    if (!ok) return { ok: false, status: 500, json: async () => ({ error: "no" }) };
    return { ok: true, status: 200, json: async () => ({}) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setup(ids: string[]) {
  const onCleared = vi.fn();
  const onDone = vi.fn();
  const view = renderHook(() => useBulkActions({ selectedIds: new Set(ids), onCleared, onDone }));
  return { view, onCleared, onDone };
}

beforeEach(() => vi.stubGlobal("confirm", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("acting on a selection of members", () => {
  it("asks before sending anything", async () => {
    const fetchMock = stubFetch();
    const { view } = setup(["a", "b"]);

    act(() => view.result.current.askApprove());

    expect(view.result.current.asking?.message).toBe(texts.approve(2));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never asks through the browser", () => {
    stubFetch();
    const { view } = setup(["a"]);

    act(() => view.result.current.askApprove());

    expect(globalThis.confirm).not.toHaveBeenCalled();
  });

  it("asks nothing when nothing is selected", () => {
    stubFetch();
    const { view } = setup([]);

    act(() => view.result.current.askApprove());

    expect(view.result.current.asking).toBeNull();
  });

  it("sends one request per selected member once the reader agrees", async () => {
    const fetchMock = stubFetch();
    const { view, onCleared, onDone } = setup(["a", "b", "c"]);

    act(() => view.result.current.askApprove());
    await act(async () => {
      await view.result.current.asking!.run();
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onCleared).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it("says how many did not go through rather than saying nothing", async () => {
    stubFetch(true, false, false);
    const { view } = setup(["a", "b", "c"]);

    act(() => view.result.current.askApprove());
    await act(async () => {
      await view.result.current.asking!.run();
    });

    await waitFor(() => expect(view.result.current.error).toBe(texts.someFailed(2)));
  });

  it("says nothing when every request went through", async () => {
    stubFetch();
    const { view } = setup(["a", "b"]);

    act(() => view.result.current.askApprove());
    await act(async () => {
      await view.result.current.asking!.run();
    });

    expect(view.result.current.error).toBe("");
  });

  it("names the reason in the question when refusing", () => {
    stubFetch();
    const { view } = setup(["a"]);

    act(() => view.result.current.askRefuse("إثبات غير واضح"));

    expect(view.result.current.asking?.message).toBe(texts.refuse(1, "إثبات غير واضح"));
    expect(view.result.current.asking?.danger).toBe(true);
  });

  it("names the age group in the question when moving", () => {
    stubFetch();
    const { view } = setup(["a", "b"]);

    act(() => view.result.current.askMoveToAge("الرواد"));

    expect(view.result.current.asking?.message).toBe(texts.move(2, "الرواد"));
  });

  it("asks nothing about moving when no age group has been picked", () => {
    stubFetch();
    const { view } = setup(["a"]);

    act(() => view.result.current.askMoveToAge(""));

    expect(view.result.current.asking).toBeNull();
  });

  it("drops the question when the reader backs out", () => {
    stubFetch();
    const { view } = setup(["a"]);

    act(() => view.result.current.askApprove());
    act(() => view.result.current.stopAsking());

    expect(view.result.current.asking).toBeNull();
  });
});
