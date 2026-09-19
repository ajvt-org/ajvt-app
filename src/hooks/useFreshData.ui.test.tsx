import { describe, it, expect, vi, afterEach } from "vitest";
import { render, act, cleanup, waitFor } from "@testing-library/react";
import { useFreshData, useFreshDataFromElsewhere } from "./useFreshData";
import { announceChange, forgetDataListeners } from "@/lib/dataChanged";

function visibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

function Screen({ reload, enabled }: { reload: () => void; enabled?: boolean }) {
  useFreshData(reload, enabled);
  return null;
}

afterEach(() => {
  cleanup();
  forgetDataListeners();
  visibility("visible");
});

describe("a screen kept fresh", () => {
  it("reloads when a change is announced while it is on screen", () => {
    const reload = vi.fn();
    render(<Screen reload={reload} />);

    act(() => announceChange());

    expect(reload).toHaveBeenCalledOnce();
  });

  it("holds off while the tab is hidden", () => {
    const reload = vi.fn();
    render(<Screen reload={reload} />);
    visibility("hidden");

    act(() => announceChange());

    expect(reload).not.toHaveBeenCalled();
  });

  it("catches up once the hidden tab is looked at again", () => {
    const reload = vi.fn();
    render(<Screen reload={reload} />);
    visibility("hidden");
    act(() => announceChange());

    visibility("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(reload).toHaveBeenCalledOnce();
  });

  it("reloads once however many changes landed while it was hidden", () => {
    const reload = vi.fn();
    render(<Screen reload={reload} />);
    visibility("hidden");
    act(() => {
      announceChange();
      announceChange();
      announceChange();
    });

    visibility("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not reload on a look back when nothing changed", () => {
    const reload = vi.fn();
    render(<Screen reload={reload} />);

    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(reload).not.toHaveBeenCalled();
  });

  it("stays quiet when it is switched off", () => {
    const reload = vi.fn();
    render(<Screen reload={reload} enabled={false} />);

    act(() => announceChange());

    expect(reload).not.toHaveBeenCalled();
  });

  it("stops listening once the screen is gone", () => {
    const reload = vi.fn();
    render(<Screen reload={reload} />);
    cleanup();

    act(() => announceChange());

    expect(reload).not.toHaveBeenCalled();
  });

  it("calls the reload it was last given, not the first", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Screen reload={first} />);

    rerender(<Screen reload={second} />);
    act(() => announceChange());

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});

describe("a screen that only wants changes made elsewhere", () => {
  function Elsewhere({ reload }: { reload: () => void }) {
    useFreshDataFromElsewhere(reload);
    return null;
  }

  function anotherTabWrites() {
    const other = new BroadcastChannel("ajvt-data-changed");
    other.postMessage(1);
    other.close();
  }

  it("ignores a change this tab made itself, which it already handled", () => {
    const reload = vi.fn();
    render(<Elsewhere reload={reload} />);

    act(() => announceChange());

    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads for a change another tab made", async () => {
    const reload = vi.fn();
    render(<Elsewhere reload={reload} />);

    anotherTabWrites();

    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
  });

  it("still reaches a screen that wants every change", async () => {
    const reload = vi.fn();
    render(<Screen reload={reload} />);

    anotherTabWrites();

    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
  });
});
