import { describe, it, expect, afterEach } from "vitest";
import { toLocalInput, fromLocalInput, localMoment } from "./localDateInput";

const local = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

describe("a datetime-local field", () => {
  it("shows a moment as the wall clock time of whoever is reading it", () => {
    expect(toLocalInput("2026-08-20T08:30:00.000Z")).toBe(local("2026-08-20T08:30:00.000Z"));
  });

  it("reads a wall clock time back as the moment it names", () => {
    const iso = fromLocalInput(local("2026-08-20T08:30:00.000Z"));

    expect(iso).toBe("2026-08-20T08:30:00.000Z");
  });

  it("round trips", () => {
    for (const iso of ["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:00.000Z"]) {
      expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    }
  });

  it("drops the seconds the control does not carry", () => {
    expect(toLocalInput("2026-08-20T08:30:45.000Z")).toBe(local("2026-08-20T08:30:00.000Z"));
  });

  it("shows nothing for a value it cannot read", () => {
    expect(toLocalInput("")).toBe("");
    expect(toLocalInput("nonsense")).toBe("");
    expect(fromLocalInput("")).toBe("");
    expect(fromLocalInput("nonsense")).toBe("");
  });
});

describe("a printed moment", () => {
  it("reads the date and the time on the clock of the device", () => {
    const at = "2026-09-23T14:15:00.000Z";
    const [day, clock] = local(at).split("T");

    expect(localMoment(at)).toEqual({ date: day.split("-").join("/"), time: clock });
  });

  it("takes a Date as well as a string", () => {
    const at = new Date("2026-09-23T14:15:00.000Z");

    expect(localMoment(at)).toEqual(localMoment(at.toISOString()));
  });

  it("prints nothing for a moment it cannot read", () => {
    expect(localMoment("")).toEqual({ date: "", time: "" });
    expect(localMoment("nonsense")).toEqual({ date: "", time: "" });
  });
});

describe("a reader outside the club timezone", () => {
  const zone = process.env.TZ;

  afterEach(() => {
    process.env.TZ = zone;
  });

  it("sees the moment on their own clock, not the club's", () => {
    process.env.TZ = "America/Toronto";

    expect(localMoment("2026-09-23T14:15:00.000Z")).toEqual({ date: "2026/09/23", time: "10:15" });
  });

  it("turns the day over with the reader's clock", () => {
    process.env.TZ = "Asia/Dubai";

    expect(localMoment("2026-09-23T22:30:00.000Z")).toEqual({ date: "2026/09/24", time: "02:30" });
  });
});
