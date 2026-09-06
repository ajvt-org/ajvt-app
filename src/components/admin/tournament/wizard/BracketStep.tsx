"use client";

import { setupWizard as texts, setupLabels } from "@/lib/texts";
import { bracketRoundLabel } from "@/lib/tournament";
import { byeCount } from "@/lib/bracketDraw";
import { knockoutRoundSizes, pairQualifierSlots } from "@/lib/knockoutSlots";

interface BracketStepProps {
  groupCount: number;
  qualifierCount: number;
  grouped: boolean;
}

export default function BracketStep({ groupCount, qualifierCount, grouped }: BracketStepProps) {
  const pairs = grouped ? pairQualifierSlots(groupCount, qualifierCount) : [];
  const sizes = knockoutRoundSizes(qualifierCount);
  const opening = sizes.at(0) ?? 0;
  const later = sizes.slice(1);
  const byes = byeCount(qualifierCount);

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">{texts.bracketTitle}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.bracketHint}
      </p>

      <div className="card p-2 space-y-1.5">
        <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
          {bracketRoundLabel(opening)}
        </p>
        {grouped && (
          <ul className="space-y-1">
            {pairs.map((pair, i) => (
              <li key={i} className="text-xs">
                {texts.slot(pair.home.position, setupLabels.groupName(pair.home.groupIndex))}{" "}
                {texts.versus}{" "}
                {texts.slot(pair.away.position, setupLabels.groupName(pair.away.groupIndex))}
              </li>
            ))}
          </ul>
        )}
        {byes > 0 && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {texts.byeSeats(byes)}
          </p>
        )}
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
