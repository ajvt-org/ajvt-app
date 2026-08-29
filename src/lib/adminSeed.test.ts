import { describe, it, expect } from "vitest";
import { seedAdminAction } from "@/lib/adminSeed";

describe("what the seed does about the admin account", () => {
  it("creates the first one when the table is empty", () => {
    expect(seedAdminAction({ defaultAdminExists: false, adminCount: 0 })).toBe("create");
  });

  it("looks at the account it ships when that one is there", () => {
    expect(seedAdminAction({ defaultAdminExists: true, adminCount: 1 })).toBe("retire");
    expect(seedAdminAction({ defaultAdminExists: true, adminCount: 4 })).toBe("retire");
  });

  it("creates nothing once the association has admins of its own", () => {
    expect(seedAdminAction({ defaultAdminExists: false, adminCount: 1 })).toBe("skip");
    expect(seedAdminAction({ defaultAdminExists: false, adminCount: 9 })).toBe("skip");
  });
});
