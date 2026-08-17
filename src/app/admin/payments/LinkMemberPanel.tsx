"use client";

import { useState } from "react";
import type { MemberOption } from "./paymentTypes";

const LIMIT = 8;

export default function LinkMemberPanel({
  members,
  busy,
  onPick,
}: {
  members: MemberOption[];
  busy: boolean;
  onPick: (memberId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim();
  const results = (query ? members.filter((m) => m.fullName.includes(query)) : members).slice(
    0,
    LIMIT,
  );

  return (
    <div
      className="mt-2 p-2 rounded-lg"
      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
    >
      <input
        type="text"
        autoFocus
        placeholder="ابحث باسم العضو..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input text-xs"
        style={{ background: "white" }}
      />
      <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
        {results.length === 0 ? (
          <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
            لا يوجد عضو مطابق
          </p>
        ) : (
          results.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              disabled={busy}
              className="w-full text-right text-xs px-2.5 py-1.5 rounded-lg font-semibold"
              style={{ background: "white", color: "var(--text-main)" }}
            >
              {m.fullName}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
