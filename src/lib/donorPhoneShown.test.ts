import { describe, it, expect } from "vitest";
import { donorPhoneShown } from "./donorPhoneShown";

const ACCOUNT = { phone: "33655124" };

describe("the phone a donation card shows", () => {
  it("is the account's when the donation names one", () => {
    expect(donorPhoneShown({ userId: "u1", donorPhone: "22110044" }, ACCOUNT)).toBe("33655124");
  });

  it("is nothing when the account has none, whatever the row holds", () => {
    expect(donorPhoneShown({ userId: "u1", donorPhone: "22110044" }, { phone: null })).toBeNull();
  });

  it("is nothing when the account has not been loaded", () => {
    expect(donorPhoneShown({ userId: "u1", donorPhone: "22110044" })).toBeNull();
  });

  it("is the stored one when the donation names no account", () => {
    expect(donorPhoneShown({ userId: null, donorPhone: "22110044" })).toBe("22110044");
  });

  it("is nothing when an unlinked donation carries none", () => {
    expect(donorPhoneShown({ userId: null, donorPhone: "  " })).toBeNull();
    expect(donorPhoneShown({})).toBeNull();
  });
});
