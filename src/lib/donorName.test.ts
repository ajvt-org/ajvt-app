import { describe, it, expect } from "vitest";
import {
  attributedDonorName,
  donorNameOnRecord,
  publicDonorName,
  typedDonorName,
} from "./donorName";

const ANON = "فاعل خير";
const TYPO = "ابو";
const ACCOUNT = "أبوبكر لمرابط";

describe("donor name resolution", () => {
  it("lets the account name win over the name an admin typed", () => {
    expect(donorNameOnRecord({ donorName: TYPO, user: { fullName: ACCOUNT } })).toBe(ACCOUNT);
  });

  it("keeps the typed name available, so unlinking restores it", () => {
    const linked = { donorName: TYPO, user: { fullName: ACCOUNT } };

    expect(typedDonorName(linked)).toBe(TYPO);
    expect(donorNameOnRecord({ donorName: linked.donorName })).toBe(TYPO);
  });

  it("falls back to the typed name when nothing is linked", () => {
    expect(donorNameOnRecord({ donorName: "زائر", user: null })).toBe("زائر");
  });

  it("falls back to the typed name when the linked account has none", () => {
    expect(donorNameOnRecord({ donorName: "زائر", user: { fullName: null } })).toBe("زائر");
  });

  it("names a giver it cannot attribute", () => {
    expect(donorNameOnRecord({ donorName: null, user: null })).toBe(ANON);
    expect(donorNameOnRecord({ donorName: "   ", user: null })).toBe(ANON);
  });

  it("has nothing to attribute when neither name is there", () => {
    expect(attributedDonorName({ donorName: null, user: null })).toBeNull();
  });

  it("hides a giver who asked to stay unnamed from the public", () => {
    expect(publicDonorName({ anonymous: true, donorName: TYPO, user: { fullName: ACCOUNT } })).toBe(
      ANON,
    );
  });

  it("still tells an admin who an unnamed giver is", () => {
    expect(donorNameOnRecord({ donorName: TYPO, user: { fullName: ACCOUNT } })).toBe(ACCOUNT);
  });

  it("names a giver publicly when they did not ask to be hidden", () => {
    expect(
      publicDonorName({ anonymous: false, donorName: TYPO, user: { fullName: ACCOUNT } }),
    ).toBe(ACCOUNT);
  });
});
