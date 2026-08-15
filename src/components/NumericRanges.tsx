import { Fragment } from "react";

// Admin-typed text like "24 - 29 أغسطس" reads backwards. A hyphen sitting
// directly between two digits binds them into one left-to-right run, but put
// spaces around it, or use an en dash, and the separator turns neutral and
// takes the paragraph's right-to-left direction with the numbers following
// it. Each range is isolated so it keeps its own direction whatever the
// author typed around it.
const RANGE = /(\d+\s*[-–—/]\s*\d+)/g;

export default function NumericRanges({ children }: { children: string }) {
  const parts = children.split(RANGE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} dir="ltr" style={{ unicodeBidi: "isolate" }}>
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
