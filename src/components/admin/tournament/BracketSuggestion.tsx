"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { matchAdmin as texts } from "@/lib/texts";
import type { BracketSuggestion as Suggestion } from "@/lib/bracketSuggestion";

type Payload = Suggestion & {
  label: string | null;
  groupStageComplete: boolean;
  bracketExists: boolean;
  firstRoundWaiting: boolean;
};

const AMBER_BG = "#fffbeb";
const AMBER_LINE = "#fcd34d";
const AMBER_INK = "#92400e";

export default function BracketSuggestion({
  activityId,
  busy,
  onValidate,
}: {
  activityId: string;
  busy: boolean;
  onValidate: (redo: boolean) => void;
}) {
  const [suggestion, setSuggestion] = useState<Payload | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<Payload>(`/api/admin/activities/${activityId}/bracket/suggestion`)
      .then((data) => {
        if (alive) setSuggestion(data);
      })
      .catch(() => {
        if (alive) setSuggestion(null);
      });
    return () => {
      alive = false;
    };
  }, [activityId]);

  if (!suggestion) return null;

  const { pairs, problem, label, groupStageComplete, bracketExists, firstRoundWaiting } =
    suggestion;
  const alreadyDrawn = bracketExists && !firstRoundWaiting;

  if (!pairs.length) {
    return (
      <p className="text-xs font-semibold" style={{ color: AMBER_INK }}>
        <IconLabel name="warning">{texts.suggestionProblem[problem ?? "notGrouped"]}</IconLabel>
      </p>
    );
  }

  return (
    <div
      className="rounded-xl p-3 space-y-2.5"
      style={{ background: AMBER_BG, border: `1px solid ${AMBER_LINE}` }}
    >
      <p className="text-sm font-black" style={{ color: AMBER_INK }}>
        <IconLabel name="swords">
          {texts.suggestionTitle}
          {label ? ` — ${label}` : ""}
        </IconLabel>
      </p>
      <p className="text-xs" style={{ color: AMBER_INK }}>
        {texts.suggestionHint}
      </p>

      <ol className="space-y-1.5">
        {pairs.map((pair, i) => (
          <li key={i} className="flex items-center gap-2 text-xs font-semibold flex-wrap">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center font-black shrink-0 leading-none"
              style={{ background: AMBER_LINE, color: AMBER_INK }}
            >
              {i + 1}
            </span>
            <bdi>{pair.home.name}</bdi>
            <span style={{ color: AMBER_INK }}>
              ({pair.home.groupName} — {texts.suggestionWinner})
            </span>
            <Icon name="swords" size={12} />
            <bdi>{pair.away.name}</bdi>
            <span style={{ color: AMBER_INK }}>
              ({pair.away.groupName} — {texts.suggestionRunnerUp})
            </span>
          </li>
        ))}
      </ol>

      {problem && (
        <p className="text-xs font-bold" style={{ color: "#991b1b" }}>
          <IconLabel name="warning">{texts.suggestionProblem[problem]}</IconLabel>
        </p>
      )}

      {!groupStageComplete ? (
        <p className="text-xs font-semibold" style={{ color: AMBER_INK }}>
          {texts.suggestionGroupStageOpen}
        </p>
      ) : (
        <button
          onClick={() => onValidate(alreadyDrawn)}
          disabled={busy}
          className="btn btn-primary text-sm"
          style={{ width: "auto" }}
        >
          <IconLabel name="check">
            {alreadyDrawn ? texts.suggestionRedo : texts.suggestionValidate}
          </IconLabel>
        </button>
      )}
    </div>
  );
}
