"use client";

import { useState } from "react";
import { matchesSearch, searchTokens } from "@/lib/arabicText";
import { memberPicker } from "@/lib/texts";
import MemberIdentity, { identityText } from "./MemberIdentity";
import type { MemberOption } from "./paymentTypes";

const LIMIT = 8;

export default function LinkMemberPanel({
  members,
  busy,
  onPick,
}: {
  members: MemberOption[];
  busy: boolean;
  onPick: (userId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const tokens = searchTokens(search);
  const matched = tokens.length
    ? members.filter((m) => matchesSearch(identityText(m), tokens))
    : members;
  const results = matched.slice(0, LIMIT);
  const hidden = matched.length - results.length;

  return (
    <div
      className="mt-2 p-2 rounded-lg"
      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
    >
      <input
        type="text"
        autoFocus
        placeholder={memberPicker.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input text-xs"
        style={{ background: "white" }}
      />
      <div className="mt-1.5 space-y-1 max-h-52 overflow-y-auto">
        {results.length === 0 ? (
          <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
            {memberPicker.noMatch}
          </p>
        ) : (
          results.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m.userId)}
              disabled={busy}
              className="w-full text-right text-xs px-2.5 py-1.5 rounded-lg"
              style={{ background: "white" }}
            >
              <MemberIdentity member={m} />
            </button>
          ))
        )}
      </div>
      {hidden > 0 && (
        <p className="text-[11px] text-center pt-1.5" style={{ color: "var(--text-muted)" }}>
          {memberPicker.more(hidden)}
        </p>
      )}
    </div>
  );
}
