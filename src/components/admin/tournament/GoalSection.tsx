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
      {period === "REGULAR" && mine.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.goalless}
        </p>
      )}
      {mine.map(({ g, index }) => (
        <div
          key={index}
          className="flex items-center gap-2 text-xs font-semibold flex-wrap rounded-lg"
          style={
            editing === index
              ? { background: "var(--mint-100)", padding: "2px 6px" }
              : { padding: "2px 6px" }
          }
        >
          <Icon name="ball" size={13} />
          <span className="min-w-0">
            {sides.find((t) => t.id === g.teamId)?.name} — {nameOf(g.userId)}
            {g.minute ? ` ${g.minute}'` : ""}
            {goalSuffix(g.kind)}
          </span>
          <button
            type="button"
            onClick={() => startEditing(index)}
            aria-label={texts.edit}
            className="px-1.5 rounded-lg"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <Icon name="pencil" size={12} />
          </button>
          <button
            type="button"
            onClick={() => {
              setGoals((prev) => prev.filter((_, j) => j !== index));
              reset();
            }}
            aria-label={texts.remove}
            className="px-1.5 rounded-lg"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            <Icon name="close" size={12} />
          </button>
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
