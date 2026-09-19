import { describe, it, expect, vi, afterEach } from "vitest";
import { announceChange, onDataChange, forgetDataListeners } from "./dataChanged";

afterEach(() => {
  forgetDataListeners();
  vi.restoreAllMocks();
});

describe("announcing a change", () => {
  it("tells every listener", () => {
    const first = vi.fn();
    const second = vi.fn();
    onDataChange(first);
    onDataChange(second);

    announceChange();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it("stops telling a listener that has gone", () => {
    const listener = vi.fn();
    const stop = onDataChange(listener);

    stop();
    announceChange();

    expect(listener).not.toHaveBeenCalled();
  });

  it("still tells the rest when one listener throws", () => {
    const after = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    onDataChange(() => {
      throw new Error("no");
    });
    onDataChange(after);

    expect(() => announceChange()).not.toThrow();
    expect(after).toHaveBeenCalledOnce();
  });

  it("survives a listener that unsubscribes while being told", () => {
    const second = vi.fn();
    const stop = onDataChange(() => stop());
    onDataChange(second);

    announceChange();

    expect(second).toHaveBeenCalledOnce();
  });

  it("says nothing when nobody is listening", () => {
    expect(() => announceChange()).not.toThrow();
  });
});
