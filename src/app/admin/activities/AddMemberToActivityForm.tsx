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
  registeredIds,
  actionLoading,
  onRegister,
}: {
  activityId: string;
  candidates: MemberOption[];
  registeredIds: Set<string>;
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
  const everyoneRegistered =
    candidates.length > 0 && candidates.every((c) => registeredIds.has(c.id));

  async function pick(userId: string) {
    if (await onRegister(activityId, userId)) setSearch("");
  }

  // A card of its own, so the search inside it reads as part of adding a member
  // rather than as another way to filter the list below.
  return (
    <div className="card p-3 space-y-1.5">
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="plus">{texts.add}</IconLabel>
      </p>
      <input
        type="text"
        placeholder={texts.search}
        aria-label={texts.addSearchLabel}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input input-sm w-full"
        style={{ background: "var(--mint-50)" }}
      />
      {tokens.length === 0 ? (
        <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
          {everyoneRegistered ? texts.allRegistered : texts.searchToBegin}
        </p>
      ) : results.length === 0 ? (
        <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
          {texts.noMatch}
        </p>
      ) : (
        <div className="space-y-1">
          {results.map((candidate) => {
            const taken = registeredIds.has(candidate.id);
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => pick(candidate.id)}
                disabled={actionLoading || taken}
                aria-disabled={taken}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg"
                style={{ background: "var(--mint-50)", opacity: taken ? 0.6 : 1 }}
              >
                <PersonIdentity
                  person={candidate}
                  detail={<span>{texts.candidateDetail(candidate.village, candidate.age)}</span>}
                />
                {taken ? (
                  <span className="badge shrink-0">{texts.alreadyRegistered}</span>
                ) : (
                  candidate.status !== "ACTIVE" && (
                    <span className="badge shrink-0">{memberStatusLabels[candidate.status]}</span>
                  )
                )}
              </button>
            );
          })}
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
