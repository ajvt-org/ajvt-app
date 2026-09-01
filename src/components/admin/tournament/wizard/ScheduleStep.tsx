"use client";

import { setupWizard as texts, setupLabels } from "@/lib/texts";
import type { GroupFixture } from "@/lib/tournamentFixtures";
import type { WizardTeam } from "@/lib/tournamentWizard";

interface ScheduleStepProps {
  fixtures: GroupFixture[];
  teamsById: Map<string, WizardTeam>;
}

export default function ScheduleStep({ fixtures, teamsById }: ScheduleStepProps) {
  const rounds = [...new Set(fixtures.map((f) => f.round))].sort((a, b) => a - b);
  const name = (id: string) => teamsById.get(id)?.name ?? "";

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">{texts.scheduleTitle}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.scheduleHint}
      </p>

      {rounds.map((round) => (
        <div key={round} className="card p-2">
          <p className="text-xs font-bold mb-1.5" style={{ color: "var(--mint-700)" }}>
            {texts.roundTitle(round)}
          </p>
          <ul className="space-y-1">
            {fixtures
              .filter((f) => f.round === round)
              .map((f, i) => (
                <li key={`${round}-${f.groupIndex}-${i}`} className="text-xs flex gap-1.5">
                  <span style={{ color: "var(--text-muted)" }}>
                    {setupLabels.groupName(f.groupIndex)}
                  </span>
                  <span className="truncate">
                    {name(f.homeTeamId)} {texts.versus} {name(f.awayTeamId)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
