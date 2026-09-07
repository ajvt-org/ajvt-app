import { describe, it, expect } from "vitest";
import { mostRestrictive, type OwnedMatch } from "./uploadMatch";

const photo: OwnedMatch = { kind: "photo", ownerId: "u1", confidential: false };
const proof: OwnedMatch = { kind: "membership", ownerId: "u2", confidential: false };
const secret: OwnedMatch = { kind: "donations", ownerId: "u2", confidential: true };
const expense: OwnedMatch = { kind: "expense", ownerId: null, confidential: false };

describe("mostRestrictive", () => {
  it("answers nothing when no column holds the name", () => {
    expect(mostRestrictive([null, null])).toBeNull();
  });

  it("answers the only match there is", () => {
    expect(mostRestrictive([null, photo, null])).toBe(photo);
  });

  it("takes a proof over a member photo, whichever comes first", () => {
    expect(mostRestrictive([photo, proof])).toBe(proof);
    expect(mostRestrictive([proof, photo])).toBe(proof);
  });

  it("takes a confidential proof over an ordinary one", () => {
    expect(mostRestrictive([proof, secret])).toBe(secret);
    expect(mostRestrictive([secret, proof])).toBe(secret);
  });

  it("takes an expense over a proof an owner can reach", () => {
    expect(mostRestrictive([proof, expense])).toBe(expense);
  });

  it("keeps a confidential proof ahead of an expense", () => {
    expect(mostRestrictive([expense, secret])).toBe(secret);
  });

  it("keeps the first of two that are equally restrictive", () => {
    const mirrored: OwnedMatch = { kind: "membership", ownerId: "u2", confidential: false };

    expect(mostRestrictive([proof, mirrored])).toBe(proof);
  });
});
