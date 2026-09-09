import { describe, it, expect } from "vitest";
import { adminSettings, scopedSettings } from "./adminSettings";
import { OWNER_ROLE, SUPER_ROLE } from "./adminRoles";
import { defaultSettings } from "./settings";

const SAVED = {
  ...defaultSettings(),
  whatsappGroup: "https://chat.whatsapp.com/secret",
  secretaryName: "Secretary",
  treasurerName: "Treasurer",
  tempPasswordHours: 12,
};

describe("what the admin settings route hands out", () => {
  it("keeps the whole row for full access", () => {
    for (const role of [SUPER_ROLE, OWNER_ROLE]) {
      expect(adminSettings(SAVED, role)).toEqual(SAVED);
    }
  });

  it("names the fields a scoped admin reads, so a new setting is not handed out by being added", () => {
    expect(Object.keys(adminSettings(SAVED, "MEMBERS")).sort()).toEqual(
      ["membershipFee", "membershipYear", "secretaryName", "treasurerName"].sort(),
    );
  });

  it("keeps the group link and the password window out of the scoped read", () => {
    const narrow = scopedSettings(SAVED) as unknown as Record<string, unknown>;

    expect(narrow.whatsappGroup).toBeUndefined();
    expect(narrow.tempPasswordHours).toBeUndefined();
    expect(Object.values(narrow)).not.toContain("https://chat.whatsapp.com/secret");
  });

  it("carries what the dashboard and the receipts screen read", () => {
    const narrow = scopedSettings(SAVED);

    expect(narrow.membershipFee).toBe(SAVED.membershipFee);
    expect(narrow.membershipYear).toBe(SAVED.membershipYear);
    expect(narrow.secretaryName).toBe(SAVED.secretaryName);
    expect(narrow.treasurerName).toBe(SAVED.treasurerName);
  });

  it("narrows an unknown role rather than widening it", () => {
    expect(Object.keys(adminSettings(SAVED, null))).toHaveLength(4);
    expect(Object.keys(adminSettings(SAVED, "ACTIVITY"))).toHaveLength(4);
  });
});
