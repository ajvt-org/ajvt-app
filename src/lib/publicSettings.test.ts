import { describe, it, expect } from "vitest";
import { publicSettings } from "./publicSettings";
import { defaultSettings } from "./settings";

const SAVED = {
  ...defaultSettings(),
  whatsappGroup: "https://chat.whatsapp.com/secret",
  secretaryName: "الأمين",
  treasurerName: "المسؤول",
  tempPasswordHours: 12,
};

describe("what the public settings route hands out", () => {
  it("names the fields it publishes, so a new setting is not published by being added", () => {
    expect(Object.keys(publicSettings(SAVED)).sort()).toEqual(
      ["asksBankReference", "membershipFee", "showsReferenceCode", "supportWhatsapp"].sort(),
    );
  });

  it("keeps the members only group link out of it", () => {
    const published = publicSettings(SAVED) as unknown as Record<string, unknown>;

    expect(published.whatsappGroup).toBeUndefined();
    expect(Object.values(published)).not.toContain("https://chat.whatsapp.com/secret");
  });

  it("keeps the membership year out of it, an admin screen reads that with a session", () => {
    const published = publicSettings(SAVED) as unknown as Record<string, unknown>;

    expect(published.membershipYear).toBeUndefined();
  });

  it("keeps the officer names and the password window out of it", () => {
    const published = publicSettings(SAVED) as unknown as Record<string, unknown>;

    expect(published.secretaryName).toBeUndefined();
    expect(published.treasurerName).toBeUndefined();
    expect(published.tempPasswordHours).toBeUndefined();
  });

  it("carries what the انتساب form and the forgotten password screen read", () => {
    const published = publicSettings(SAVED);

    expect(published.membershipFee).toBe(SAVED.membershipFee);
    expect(published.supportWhatsapp).toBe(SAVED.supportWhatsapp);
    expect(published.asksBankReference).toBe(false);
    expect(published.showsReferenceCode).toBe(false);
  });
});
