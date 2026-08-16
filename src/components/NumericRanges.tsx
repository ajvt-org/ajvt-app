import { Fragment } from "react";

// A range in Arabic prose reads first-value-first, and Arabic reads right to
// left, so "24 - 29 أغسطس" must put 24 on the right. Two things get in the way.
//
// A hyphen with spaces around it is a neutral, so it takes the paragraph
// direction and drags the numbers with it; a hyphen with no spaces is a
// separator that binds both numbers into one left-to-right run, which pins 24
// on the left whatever the paragraph says. Each number is therefore isolated
// on its own, which leaves the separator neutral inside an explicitly
// right-to-left box: the pair orders by the sentence, each number keeps its own
// digits in order.
//
// A slash is different and is left going left to right: "5/32 مشارك" is a count
// out of a total, not a range, and 32/5 would be a different claim.
const NUM = String.raw`\d+(?::\d+)?`;
const RANGE = new RegExp(`(${NUM})(\\s*[-–—]\\s*)(${NUM})|(${NUM}\\s*/\\s*${NUM})`, "g");

type Token =
  | { kind: "text"; text: string }
  | { kind: "range"; from: string; separator: string; to: string }
  | { kind: "fraction"; text: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
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

export default function NumericRanges({ children }: { children: string }) {
  return (
    <>
      {tokenize(children).map((token, i) => {
        if (token.kind === "text") return <Fragment key={i}>{token.text}</Fragment>;
        if (token.kind === "fraction") {
          return (
            <span key={i} dir="ltr" style={{ unicodeBidi: "isolate" }}>
              {token.text}
            </span>
          );
        }
        return (
          <span key={i} dir="rtl" style={{ unicodeBidi: "isolate" }}>
            <bdi>{token.from}</bdi>
            {token.separator}
            <bdi>{token.to}</bdi>
          </span>
        );
      })}
    </>
  );
}
