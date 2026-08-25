import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { JSDOM } from "jsdom";

const store = new JSDOM("", { url: "http://localhost:3000" }).window;

for (const name of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: () => store[name],
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
