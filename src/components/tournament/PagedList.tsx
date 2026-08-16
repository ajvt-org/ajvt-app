"use client";

import { Children, useState, type ReactNode } from "react";
import IconLabel from "@/components/IconLabel";

// A leaderboard runs as long as the squad list does. The rows are already on
// the page, so paging here is only about how much is put in front of a reader
// at once, and a press costs no request.
export default function PagedList({
  children,
  pageSize = 10,
}: {
  children: ReactNode;
  pageSize?: number;
}) {
  const items = Children.toArray(children);
  const [shown, setShown] = useState(pageSize);

  return (
    <div className="space-y-2">
      {items.slice(0, shown)}
      {shown < items.length && (
        <button
          type="button"
          onClick={() => setShown((s) => s + pageSize)}
          className="btn"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="chevronDown">عرض المزيد</IconLabel>
        </button>
      )}
    </div>
  );
}
