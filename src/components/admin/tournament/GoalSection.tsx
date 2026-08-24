"use client";

import { useState } from "react";
import type { GoalKind, GoalPeriod } from "./types";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import FieldRow from "@/components/admin/FieldRow";
import { matchAdmin as texts } from "@/lib/texts";
import { KIND_LABEL, goalSuffix, type GoalDraft } from "./goalDraft";

export default function GoalSection({
  title,
  period,
  goals,
  setGoals,
  sides,
  scorerRoster,
  nameOf,
}: {
  title: string;
  period: GoalPeriod;
  goals: GoalDraft[];
  setGoals: React.Dispatch<React.SetStateAction<GoalDraft[]>>;
  sides: { id: string; name: string }[];
  scorerRoster: (teamId: string, kind: GoalKind) => { id: string; fullName: string }[];
  nameOf: (memberId: string | null) => string;
}) {
  const [teamId, setTeamId] = useState(sides[0].id);
  const [kind, setKind] = useState<GoalKind>("GOAL");
  const [memberId, setMemberId] = useState("");
  const [minute, setMinute] = useState("");

  const mine = goals.map((g, index) => ({ g, index })).filter(({ g }) => g.period === period);

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="ball">{title}</IconLabel>
      </p>
      {period === "REGULAR" && mine.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.goalless}
        </p>
      )}
      {mine.map(({ g, index }) => (
        <div key={index} className="flex items-center gap-2 text-xs font-semibold flex-wrap">
          <Icon name="ball" size={13} />
          <span className="min-w-0">
            {sides.find((t) => t.id === g.teamId)?.name} — {nameOf(g.memberId)}
            {g.minute ? ` ${g.minute}'` : ""}
            {goalSuffix(g.kind)}
          </span>
          <button
            type="button"
            onClick={() => setGoals((prev) => prev.filter((_, j) => j !== index))}
            aria-label={texts.remove}
            className="px-1.5 rounded-lg"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      ))}
      <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--mint-50)" }}>
        <FieldRow label={texts.fieldTeam}>
          {(id) => (
            <select
              id={id}
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setMemberId("");
              }}
              className="input text-sm"
            >
              {sides.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </FieldRow>

        <FieldRow label={texts.fieldKind}>
          {(id) => (
            <select
              id={id}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as GoalKind);
                setMemberId("");
              }}
              className="input text-sm"
            >
              {(Object.keys(KIND_LABEL) as GoalKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          )}
        </FieldRow>

        <FieldRow
          label={texts.fieldScorer}
          hint={kind === "OWN_GOAL" ? texts.ownGoalHint : undefined}
        >
          {(id) => (
            <select
              id={id}
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="input text-sm"
            >
              <option value="">{texts.unknownScorer}</option>
              {scorerRoster(teamId, kind).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          )}
        </FieldRow>

        <FieldRow label={texts.fieldMinute} hint={texts.minuteHint}>
          {(id) => (
            <input
              id={id}
              type="number"
              min={1}
              max={130}
              inputMode="numeric"
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="input text-sm"
            />
          )}
        </FieldRow>

        <button
          type="button"
          onClick={() => {
            setGoals((prev) => [
              ...prev,
              { teamId, kind, memberId: memberId || null, period, minute },
            ]);
            setMemberId("");
            setMinute("");
          }}
          className="btn btn-primary text-sm"
        >
          <IconLabel name="plus">{texts.addGoal}</IconLabel>
        </button>
      </div>
    </div>
  );
}
