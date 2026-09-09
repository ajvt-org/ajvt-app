import { describe, it, expect } from "vitest";
import { ApiError } from "./api";
import { refusalMessage } from "./apiFailure";

const FALLBACK = "تعذّر التحميل";

describe("what a failed load tells the admin", () => {
  it("shows the sentence the server refused with", () => {
    expect(refusalMessage(new ApiError("أكمل الإعداد", 409), FALLBACK)).toBe("أكمل الإعداد");
  });

  it("shows it for every refusal the server explains", () => {
    expect(refusalMessage(new ApiError("لا صلاحية", 403), FALLBACK)).toBe("لا صلاحية");
    expect(refusalMessage(new ApiError("غير موجود", 404), FALLBACK)).toBe("غير موجود");
  });

  it("keeps the screen's own sentence when the server broke", () => {
    expect(refusalMessage(new ApiError("فشلت العملية", 500), FALLBACK)).toBe(FALLBACK);
  });

  it("keeps it when the request never reached the server", () => {
    expect(refusalMessage(new ApiError("تعذر الاتصال", 0), FALLBACK)).toBe(FALLBACK);
  });

  it("keeps it for anything that is not a request failure", () => {
    expect(refusalMessage(new Error("boom"), FALLBACK)).toBe(FALLBACK);
    expect(refusalMessage("boom", FALLBACK)).toBe(FALLBACK);
  });
});
