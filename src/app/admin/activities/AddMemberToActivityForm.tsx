"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import { matchesSearch, searchTokens } from "@/lib/arabicText";
import { memberStatusLabels } from "@/lib/messages";
import { activityRegistrants as texts } from "@/lib/texts";
import type { MemberOption } from "./activityTypes";

const LIMIT = 8;

export default function AddMemberToActivityForm({
  activityId,
  candidates,
  actionLoading,
  onRegister,
}: {
  activityId: string;
  candidates: MemberOption[];
  actionLoading: boolean;
  onRegister: (activityId: string, memberId: string) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");

  const tokens = searchTokens(search);
  const matched = tokens.length
    ? candidates.filter((m) => matchesSearch(`${m.fullName} ${m.phone ?? ""}`, tokens))
    : candidates;
  const results = matched.slice(0, LIMIT);
  const hidden = matched.length - results.length;

  async function pick(accountId: string) {
    if (await onRegister(activityId, accountId)) setSearch("");
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="plus">{texts.add}</IconLabel>
      </p>
      <input
        type="text"
        placeholder={texts.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input text-sm"
      />
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {results.length === 0 ? (
          <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
            {candidates.length === 0 ? texts.allRegistered : texts.noMatch}
          </p>
        ) : (
          results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pick(m.id)}
              disabled={actionLoading}
              className="w-full flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg"
              style={{ background: "var(--mint-50)" }}
            >
              <span className="min-w-0 truncate" style={{ color: "var(--text-main)" }}>
                {m.fullName}
              </span>
              <span className="badge shrink-0">{memberStatusLabels[m.status]}</span>
            </button>
          ))
        )}
      </div>
      {hidden > 0 && (
        <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
          {texts.more(hidden)}
        </p>
      )}
    </div>
  );
}
