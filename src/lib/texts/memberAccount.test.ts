import { describe, it, expect } from "vitest";
import { tempPassword } from "./memberAccount";

describe("the message that carries a temporary password", () => {
  const message = tempPassword.message("J2AF3JQL4D", "ساعة واحدة");

  it("carries the password on a line of its own", () => {
    expect(message.split("\n")).toContain("J2AF3JQL4D");
  });

  it("says how long it lasts in the words it was given", () => {
    expect(message).toContain("صالحة ساعة واحدة");
    expect(tempPassword.message("X", "3 ساعات")).toContain("صالحة 3 ساعات");
  });

  it("opens on a greeting and closes on what to do with it", () => {
    expect(message.startsWith("السلام عليكم")).toBe(true);
    expect(message.endsWith("ويطلب منك تغييرها عند أول دخول")).toBe(true);
  });

  it("names the association so the member knows what the password is for", () => {
    expect(message).toContain("رابطة شباب قرية التاكلالت");
  });
});
