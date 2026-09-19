"use client";

import { useState } from "react";
import type { GoalKind, GoalPeriod } from "./types";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import FieldRow from "@/components/admin/FieldRow";
import { matchAdmin as texts, matchEventLabel } from "@/lib/texts";
import { KIND_LABEL, goalSuffix, type GoalDraft } from "./goalDraft";
import { EVENT_ROW, EVENT_ROW_ACTIONS, EVENT_ROW_TEXT, SQUARE } from "./MatchCardActions";
import { ROW_ACTION_ICON } from "./TeamIdentityEditor";
import NumberInput from "@/components/NumberInput";

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
  nameOf: (userId: string | null) => string;
}) {
  const [teamId, setTeamId] = useState(sides[0].id);
  const [kind, setKind] = useState<GoalKind>("GOAL");
  const [userId, setUserId] = useState("");
  const [minute, setMinute] = useState("");
  const [editing, setEditing] = useState<number | null>(null);

  const mine = goals.map((g, index) => ({ g, index })).filter(({ g }) => g.period === period);

  function reset() {
    setEditing(null);
    setTeamId(sides[0].id);
    setKind("GOAL");
    setUserId("");
    setMinute("");
  }

  function startEditing(index: number) {
    const goal = goals[index];
    setEditing(index);
    setTeamId(goal.teamId);
    setKind(goal.kind);
    setUserId(goal.userId ?? "");
    setMinute(goal.minute);
  }

  function submit() {
    const draft: GoalDraft = { teamId, kind, userId: userId || null, period, minute };
    if (editing === null) setGoals((prev) => [...prev, draft]);
    else setGoals((prev) => prev.map((g, i) => (i === editing ? draft : g)));
    reset();
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="ball">{title}</IconLabel>
      </p>
      {mine.map(({ g, index }) => (
        <div
          key={index}
          className={`${EVENT_ROW} font-semibold`}
          style={
            editing === index
              ? { background: "var(--mint-100)", padding: "2px 6px" }
              : { padding: "2px 6px" }
          }
        >
          <span className={EVENT_ROW_TEXT}>
            <Icon name="ball" size={13} />
            <span className="min-w-0">
              {matchEventLabel(
                [sides.find((t) => t.id === g.teamId)?.name, nameOf(g.userId)],
                g.minute,
              )}
              {goalSuffix(g.kind)}
            </span>
          </span>
          <span className={EVENT_ROW_ACTIONS}>
            <button
              type="button"
              onClick={() => startEditing(index)}
              aria-label={texts.edit}
              className={SQUARE}
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              <Icon name="pencil" size={ROW_ACTION_ICON} />
            </button>
            <button
              type="button"
              onClick={() => {
                setGoals((prev) => prev.filter((_, j) => j !== index));
                reset();
              }}
              aria-label={texts.remove}
              className={SQUARE}
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <Icon name="close" size={ROW_ACTION_ICON} />
            </button>
          </span>
        </div>
      ))}
      <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--mint-50)" }}>
        {editing !== null && (
          <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
            <IconLabel name="pencil">{texts.editingGoal}</IconLabel>
          </p>
        )}
        <FieldRow label={texts.fieldTeam}>
          {(id) => (
            <select
              id={id}
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setUserId("");
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
                setUserId("");
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
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
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
            <NumberInput
              id={id}
              min={1}
              max={130}
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="input text-sm"
            />
          )}
        </FieldRow>

        <div className="flex gap-2">
          <button type="button" onClick={submit} className="btn btn-primary text-sm">
            <IconLabel name={editing === null ? "plus" : "check"}>
              {editing === null ? texts.addGoal : texts.saveEdit}
            </IconLabel>
          </button>
          {editing !== null && (
            <button type="button" onClick={reset} className="btn btn-ghost text-sm">
              {texts.cancelEdit}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
