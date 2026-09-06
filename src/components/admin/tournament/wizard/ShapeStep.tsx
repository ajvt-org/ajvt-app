"use client";

import IconLabel from "@/components/IconLabel";
import { setupWizard as texts } from "@/lib/texts";
import { groupShapes, nearestBracketSizes, qualifiersPerGroup } from "@/lib/tournamentShape";
import type { WizardFormat } from "@/lib/tournamentWizard";
import { formatsFor } from "@/lib/tournamentWizard";

interface ShapeStepProps {
  teamCount: number;
  format: WizardFormat | null;
  groupCount: number | null;
  qualifierCount: number | null;
  onFormat: (format: WizardFormat) => void;
  onGroupCount: (groupCount: number) => void;
  onQualifierCount: (qualifierCount: number) => void;
}

export default function ShapeStep({
  teamCount,
  format,
  groupCount,
  qualifierCount,
  onFormat,
  onGroupCount,
  onQualifierCount,
}: ShapeStepProps) {
  const offered = formatsFor(teamCount);
  const shapes = groupShapes(teamCount);
  const chosen = shapes.find((s) => s.groupCount === groupCount);
  const nearest = nearestBracketSizes(teamCount);

  return (
    <div className="space-y-4">
      <div>
        <p className="block text-sm font-bold mb-1.5">{texts.formatLabel}</p>
        <div className="space-y-2">
          <FormatChoice
            label={texts.knockout}
            chosen={format === "KNOCKOUT"}
            disabled={!offered.includes("KNOCKOUT")}
            onChoose={() => onFormat("KNOCKOUT")}
          />
          <FormatChoice
            label={texts.groupsThenKnockout}
            chosen={format === "GROUPS_THEN_KNOCKOUT"}
            disabled={!offered.includes("GROUPS_THEN_KNOCKOUT")}
            onChoose={() => onFormat("GROUPS_THEN_KNOCKOUT")}
          />
        </div>
      </div>

      {!offered.includes("KNOCKOUT") && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <IconLabel name="warning">
            {texts.knockoutRefused(teamCount, nearest.below, nearest.above)}
          </IconLabel>
        </p>
      )}

      {format === "GROUPS_THEN_KNOCKOUT" && (
        <>
          <div>
            <label htmlFor="wizard-groups" className="block text-sm font-bold mb-1.5">
              {texts.groupCountLabel}
            </label>
            <select
              id="wizard-groups"
              className="input"
              value={groupCount ?? ""}
              onChange={(e) => onGroupCount(Number(e.target.value))}
            >
              <option value="" disabled />
              {shapes.map((shape) => (
                <option key={shape.groupCount} value={shape.groupCount}>
                  {texts.groupOption(shape.groupCount, shape.groupSize)}
                </option>
              ))}
            </select>
          </div>

          {chosen && (
            <div>
              <label htmlFor="wizard-qualifiers" className="block text-sm font-bold mb-1.5">
                {texts.qualifierCountLabel}
              </label>
              <select
                id="wizard-qualifiers"
                className="input"
                value={qualifierCount ?? ""}
                onChange={(e) => onQualifierCount(Number(e.target.value))}
              >
                <option value="" disabled />
                {chosen.qualifierCounts.map((count) => (
                  <option key={count} value={count}>
                    {texts.qualifierOption(count, qualifiersPerGroup(chosen.groupCount, count))}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FormatChoice({
  label,
  chosen,
  disabled,
  onChoose,
}: {
  label: string;
  chosen: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={disabled}
      className="w-full text-right p-3 rounded-xl"
      style={{
        background: chosen ? "var(--mint-100)" : "white",
        border: `1px solid ${chosen ? "var(--mint-500)" : "var(--mint-200)"}`,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span className="block text-sm font-bold">{label}</span>
    </button>
  );
}
