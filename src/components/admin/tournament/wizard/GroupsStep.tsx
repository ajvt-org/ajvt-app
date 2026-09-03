"use client";

import IconLabel from "@/components/IconLabel";
import { setupWizard as texts } from "@/lib/texts";
import type { DrawnGroup } from "@/lib/tournamentDraw";
import type { WizardTeam } from "@/lib/tournamentWizard";
import { setupLabels } from "@/lib/texts";

interface GroupsStepProps {
  groups: DrawnGroup<WizardTeam>[];
  swapping: string | null;
  onPick: (teamId: string) => void;
  onReshuffle: () => void;
}

export default function GroupsStep({ groups, swapping, onPick, onReshuffle }: GroupsStepProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">{texts.drawTitle}</p>
        <button type="button" onClick={onReshuffle} className="btn btn-ghost btn-sm">
          <IconLabel name="shuffle">{texts.reshuffle}</IconLabel>
        </button>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {swapping ? texts.swapWith : texts.drawHint}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {groups.map((group) => (
          <div key={group.index} className="card p-2">
            <p className="text-xs font-bold mb-1.5" style={{ color: "var(--mint-700)" }}>
              {setupLabels.groupName(group.index)}
            </p>
            <ul className="space-y-1">
              {group.teams.map((team) => (
                <li key={team.id}>
                  <button
                    type="button"
                    onClick={() => onPick(team.id)}
                    className="w-full text-right px-2 py-1 rounded-lg text-xs truncate"
                    style={{
                      background: swapping === team.id ? "var(--mint-200)" : "var(--mint-50)",
                      border: `1px solid ${
                        swapping === team.id ? "var(--mint-500)" : "transparent"
                      }`,
                    }}
                  >
                    {team.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
