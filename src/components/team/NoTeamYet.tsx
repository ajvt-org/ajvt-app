"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { TEAM_NAME_MAX } from "@/app/api/teams/schema";
import type { Team } from "@/components/activityTypes";
import { teamBuilder as texts } from "@/lib/texts";

const PICK = {
  background: "white",
  color: "var(--mint-700)",
  border: "1px solid var(--mint-200)",
};

export default function NoTeamYet({
  activityId,
  teams,
  busy,
  onCreate,
  onAskToJoin,
}: {
  activityId: string;
  teams: Team[];
  busy: boolean;
  onCreate: (name: string) => Promise<void>;
  onAskToJoin: (teamId: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="space-y-2">
      <label
        htmlFor={`new-team-${activityId}`}
        className="block text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <Icon name="flag" size={12} className="icon-inline" /> {texts.createHeading}
      </label>
      <div className="flex items-stretch gap-1.5">
        <input
          id={`new-team-${activityId}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={texts.namePlaceholder}
          maxLength={TEAM_NAME_MAX}
          className="input input-sm min-w-0 flex-1"
        />
        <button
          onClick={async () => {
            await onCreate(name);
            setName("");
          }}
          disabled={busy || !name.trim()}
          className="btn btn-primary btn-sm shrink-0"
        >
          {busy ? "..." : <IconLabel name="plus">{texts.create}</IconLabel>}
        </button>
      </div>
      {teams.length > 0 && (
        <>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {texts.orJoin}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => onAskToJoin(t.id)}
                disabled={busy}
                className="text-xs px-2.5 py-1 rounded-lg font-bold"
                style={PICK}
              >
                {t.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
