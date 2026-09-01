"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import { matchesSearch, searchTokens } from "@/lib/arabicText";
import { memberStatusLabels } from "@/lib/messages";
import { activityRegistrants as texts } from "@/lib/texts";
import PersonIdentity from "./PersonIdentity";
import type { MemberOption } from "./activityTypes";

const LIMIT = 6;

function candidateText(candidate: MemberOption): string {
  return [candidate.fullName, candidate.phone, candidate.village, candidate.age]
    .filter(Boolean)
    .join(" ");
}

export default function AddMemberToActivityForm({
  activityId,
  candidates,
  actionLoading,
  onRegister,
}: {
  activityId: string;
  candidates: MemberOption[];
  actionLoading: boolean;
  onRegister: (activityId: string, userId: string) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");

  const tokens = searchTokens(search);
  const matched = tokens.length
    ? candidates.filter((c) => matchesSearch(candidateText(c), tokens))
    : [];
  const results = matched.slice(0, LIMIT);
  const hidden = matched.length - results.length;

  async function pick(userId: string) {
    if (await onRegister(activityId, userId)) setSearch("");
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
      {tokens.length === 0 ? (
        <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
          {candidates.length === 0 ? texts.allRegistered : texts.searchToBegin}
        </p>
      ) : results.length === 0 ? (
        <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
          {texts.noMatch}
        </p>
      ) : (
        <div className="space-y-1">
          {results.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => pick(candidate.id)}
              disabled={actionLoading}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: "var(--mint-50)" }}
            >
              <PersonIdentity
                person={candidate}
                detail={<span>{texts.candidateDetail(candidate.village, candidate.age)}</span>}
              />
              {candidate.status !== "ACTIVE" && (
                <span className="badge shrink-0">{memberStatusLabels[candidate.status]}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {hidden > 0 && (
        <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
          {texts.more(hidden)}
        </p>
      )}
    </div>
  );
}
