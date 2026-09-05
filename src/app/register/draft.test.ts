import { describe, it, expect } from "vitest";
import { readDraft } from "./draft";

describe("the sign up draft", () => {
  it("reads back the fields it was given", () => {
    const stored = JSON.stringify({
      phone: "22119911",
      fullName: "محمد",
      village: "أفجار",
      age: "البدريين",
      photo: "me.webp",
    });

    expect(readDraft(stored)).toEqual({
      phone: "22119911",
      fullName: "محمد",
      village: "أفجار",
      age: "البدريين",
      photo: "me.webp",
    });
  });

  it("has nothing to say when nothing was kept", () => {
    expect(readDraft(null)).toEqual({});
  });

  it("has nothing to say when what was kept cannot be read", () => {
    expect(readDraft("{ not json")).toEqual({});
    expect(readDraft("null")).toEqual({});
    expect(readDraft('"a string"')).toEqual({});
  });

  it("keeps only the fields it knows, so a stale draft cannot smuggle anything in", () => {
    const stored = JSON.stringify({ phone: "22119911", password: "secret12", role: "ADMIN" });

    expect(readDraft(stored)).toEqual({ phone: "22119911" });
  });

  it("ignores a field that is not the shape it expects", () => {
    const stored = JSON.stringify({ phone: 22119911, fullName: "محمد", photo: 3 });

    expect(readDraft(stored)).toEqual({ fullName: "محمد" });
  });
});
