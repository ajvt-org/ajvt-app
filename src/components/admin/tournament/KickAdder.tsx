"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import FieldRow from "@/components/admin/FieldRow";
import { matchAdmin as texts } from "@/lib/texts";
import type { KickDraft } from "./goalDraft";

export default function KickAdder({
  sides,
  rosterOf,
  onAdd,
}: {
  sides: { id: string; name: string }[];
  rosterOf: (teamId: string) => { id: string; fullName: string }[];
  onAdd: (kick: KickDraft) => void;
}) {
  const [teamId, setTeamId] = useState(sides[0].id);
  const [memberId, setMemberId] = useState("");
  const [scored, setScored] = useState(true);

  return (
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

      <FieldRow label={texts.fieldPlayer}>
        {(id) => (
          <select
            id={id}
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="input text-sm"
          >
            <option value="">{texts.unknownScorer}</option>
            {rosterOf(teamId).map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
        )}
      </FieldRow>

      <FieldRow label={texts.fieldOutcome}>
        {(id) => (
          <select
            id={id}
            value={scored ? "yes" : "no"}
            onChange={(e) => setScored(e.target.value === "yes")}
            className="input text-sm"
          >
            <option value="yes">{texts.kickScored}</option>
            <option value="no">{texts.kickMissed}</option>
          </select>
        )}
      </FieldRow>

      <button
        type="button"
        onClick={() => {
          onAdd({ teamId, memberId: memberId || null, scored });
          setMemberId("");
        }}
        className="btn btn-primary text-sm"
      >
        <IconLabel name="plus">{texts.addKick}</IconLabel>
      </button>
    </div>
  );
}
