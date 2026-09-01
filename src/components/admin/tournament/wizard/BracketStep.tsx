"use client";

import { setupWizard as texts, setupLabels } from "@/lib/texts";
import { bracketRoundLabel } from "@/lib/tournament";
import { knockoutRoundSizes, pairQualifierSlots } from "@/lib/knockoutSlots";
import type { WizardTeam } from "@/lib/tournamentWizard";

interface BracketStepProps {
  groupCount: number;
  qualifierCount: number;
  teams: WizardTeam[];
  grouped: boolean;
}

export default function BracketStep({
  groupCount,
  qualifierCount,
  teams,
  grouped,
}: BracketStepProps) {
  const pairs = grouped ? pairQualifierSlots(groupCount, qualifierCount) : [];
  const later = knockoutRoundSizes(qualifierCount).slice(1);

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">{texts.bracketTitle}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.bracketHint}
      </p>

      <div className="card p-2">
        <p className="text-xs font-bold mb-1.5" style={{ color: "var(--mint-700)" }}>
          {bracketRoundLabel(qualifierCount / 2)}
        </p>
        <ul className="space-y-1">
          {grouped
            ? pairs.map((pair, i) => (
                <li key={i} className="text-xs">
                  {texts.slot(pair.home.position, setupLabels.groupName(pair.home.groupIndex))}{" "}
                  {texts.versus}{" "}
                  {texts.slot(pair.away.position, setupLabels.groupName(pair.away.groupIndex))}
                </li>
              ))
            : Array.from({ length: teams.length / 2 }, (_, i) => (
                <li key={i} className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {texts.knockoutOpeningTitle}
                </li>
              ))}
        </ul>
      </div>

      {later.map((size, i) => (
        <div key={i} className="card p-2">
          <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
            {bracketRoundLabel(size)}
          </p>
        </div>
      ))}
    </div>
  );
}
