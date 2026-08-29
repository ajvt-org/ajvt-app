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
