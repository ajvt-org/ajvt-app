"use client";

import { Children, type ReactNode } from "react";

export default function FilterRow({
  pickers = [],
  children,
}: {
  pickers?: ReactNode[];
  children?: ReactNode;
}) {
  const spans = Children.toArray(children);

  return (
    <div className="space-y-2 mb-3">
      {pickers.length > 0 && (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${pickers.length}, minmax(0, 1fr))` }}
        >
          {pickers}
        </div>
      )}
      {spans.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {spans.map((span, index) => (
            <div key={index} className="flex-1 min-w-0" style={{ flexBasis: "15rem" }}>
              {span}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
