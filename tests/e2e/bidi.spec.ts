import { test, expect, type Page } from "@playwright/test";
import { tokenizeRanges } from "../../src/lib/bidiRanges";

// The one thing jsdom cannot check. A range is written first-value-first, and
// Arabic reads right to left, so the first value has to land on the right of
// the screen. Getting that wrong is invisible to any assertion about markup —
// "24 - 29 أغسطس" shipped reading as 29 then 24 — so a real browser is asked
// where the numbers actually ended up.
//
// The markup is built from the same tokenizer the component draws from, which
// is why that lives in a .ts of its own: Playwright compiles JSX with its own
// factory, so importing the component itself yields no React elements.
function markup(text: string): string {
  return tokenizeRanges(text)
    .map((token) => {
      if (token.kind === "text") return token.text;
      if (token.kind === "fraction") {
        return `<span dir="ltr" style="unicode-bidi:isolate">${token.text}</span>`;
      }
      return (
        `<span dir="rtl" style="unicode-bidi:isolate">` +
        `<bdi>${token.from}</bdi>${token.separator}<bdi>${token.to}</bdi>` +
        `</span>`
      );
    })
    .join("");
}

async function order(page: Page, text: string, needles: string[]) {
  await page.setContent(
    `<!doctype html><html dir="rtl"><body style="font-family:sans-serif;font-size:20px">` +
      `<p id="subject">${markup(text)}</p></body></html>`,
  );
  return page.evaluate((wanted: string[]) => {
    const root = document.getElementById("subject")!;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const found: { needle: string; x: number }[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const value = node.textContent ?? "";
      for (const needle of wanted) {
        const at = value.indexOf(needle);
        if (at === -1) continue;
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + needle.length);
        found.push({ needle, x: range.getBoundingClientRect().left });
      }
    }
    return found.sort((a, b) => a.x - b.x).map((f) => f.needle);
  }, needles);
}

test.describe("numeric ranges in right-to-left text", () => {
  test("a spaced date range puts the first day on the right", async ({ page }) => {
    expect(await order(page, "24 - 29 أغسطس", ["24", "29"])).toEqual(["29", "24"]);
  });

  test("a tight hyphen does not bind the two days into one left-to-right run", async ({ page }) => {
    expect(await order(page, "24-29 أغسطس", ["24", "29"])).toEqual(["29", "24"]);
  });

  test("an en dash behaves like the others", async ({ page }) => {
    expect(await order(page, "24–29 أغسطس", ["24", "29"])).toEqual(["29", "24"]);
  });

  test("a time range starts at the kickoff, on the right", async ({ page }) => {
    expect(await order(page, "من 17:00 - 18:00", ["17:00", "18:00"])).toEqual(["18:00", "17:00"]);
  });

  // A count out of a total is not a range, and reversing it would say something
  // else entirely.
  test("a count out of a total stays left to right", async ({ page }) => {
    expect(await order(page, "5/32 مشارك", ["5", "32"])).toEqual(["5", "32"]);
  });

  test("a lone number is untouched", async ({ page }) => {
    expect(await order(page, "يوم 24 أغسطس", ["24"])).toEqual(["24"]);
  });
});
