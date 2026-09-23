import { describe, it, expect } from "vitest";
import { donateHref, giftActivityId, takesGifts } from "./activityGifts";

describe("which activity takes a public gift", () => {
  it("takes one when it is published and open", () => {
    expect(takesGifts({ published: true, isOpen: true })).toBe(true);
  });

  it.each([
    { published: false, isOpen: true },
    { published: true, isOpen: false },
    { published: false, isOpen: false },
  ])("refuses one that is published $published and open $isOpen", (activity) => {
    expect(takesGifts(activity)).toBe(false);
  });
});

describe("the activity a gift names", () => {
  it("reads a trimmed id", () => {
    expect(giftActivityId("  act-1 ")).toBe("act-1");
  });

  it.each([null, "", "   ", 12, undefined])("reads %s as general support", (raw) => {
    expect(giftActivityId(raw)).toBeNull();
  });
});

describe("the link to give to an activity", () => {
  it("carries the activity on the form", () => {
    expect(donateHref("act 1")).toBe("/donate?activityId=act%201");
  });
});
