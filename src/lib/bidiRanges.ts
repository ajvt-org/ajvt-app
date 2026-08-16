// Which parts of a string are ranges, and which way each should run.
//
// A range in Arabic prose reads first-value-first, and Arabic reads right to
// left, so "24 - 29 أغسطس" must put 24 on the right. Two things get in the way.
// A hyphen with spaces around it is a neutral, so it takes the paragraph
// direction and drags the numbers with it; a hyphen with no spaces is a
// separator that binds both numbers into one left-to-right run, which pins 24
// on the left whatever the paragraph says. So a range is reported as its two
// numbers and the separator between them, to be isolated separately.
//
// A slash is not a range: "5/32 مشارك" is a count out of a total, and 32/5
// would be a different claim. It stays left to right, whole.
//
// This is kept apart from the component that draws it so a Playwright test can
// import it — Playwright compiles JSX with its own factory, so it cannot load
// a .tsx and still get React elements out of it.
const NUM = String.raw`\d+(?::\d+)?`;
const RANGE = new RegExp(`(${NUM})(\\s*[-–—]\\s*)(${NUM})|(${NUM}\\s*/\\s*${NUM})`, "g");

export type RangeToken =
  | { kind: "text"; text: string }
  | { kind: "range"; from: string; separator: string; to: string }
  | { kind: "fraction"; text: string };

export function tokenizeRanges(text: string): RangeToken[] {
  const tokens: RangeToken[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  RANGE.lastIndex = 0;
  while ((match = RANGE.exec(text)) !== null) {
    if (match.index > last) tokens.push({ kind: "text", text: text.slice(last, match.index) });
    if (match[4]) {
      tokens.push({ kind: "fraction", text: match[4] });
    } else {
      tokens.push({ kind: "range", from: match[1], separator: match[2], to: match[3] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ kind: "text", text: text.slice(last) });
  return tokens;
}
