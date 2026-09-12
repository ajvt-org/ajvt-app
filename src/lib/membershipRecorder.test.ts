import { describe, it, expect } from "vitest";
import { adminRecorder, selfRecorder } from "./membershipRecorder";

describe("who a membership payment records as its recorder", () => {
  it("takes both the username and the id from an admin", () => {
    expect(adminRecorder({ username: "boss", adminId: "a1" })).toEqual({
      name: "boss",
      adminId: "a1",
    });
  });

  it("takes the member's own name and no admin id from a self service write", () => {
    expect(selfRecorder("محمد ولد أحمد")).toEqual({
      name: "محمد ولد أحمد",
      adminId: null,
    });
  });
});
