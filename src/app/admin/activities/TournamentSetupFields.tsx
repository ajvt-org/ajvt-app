"use client";

import IconLabel from "@/components/IconLabel";
import { tournamentSetup as texts } from "@/lib/texts";
import { isSinglesSquad, normalizePlayerCount } from "@/lib/squadSize";
import type { IconName } from "@/components/Icon";

export type MatchShapeValue = "FOOTBALL" | "SERIES";

export interface MatchShapeChoice {
  value: MatchShapeValue;
  label: string;
  hint: string;
  icon: IconName;
}

export const MATCH_SHAPES: MatchShapeChoice[] = [
  {
    value: "FOOTBALL",
    label: texts.shapes.FOOTBALL,
    hint: texts.shapeHints.FOOTBALL,
    icon: "ball",
  },
  {
    value: "SERIES",
    label: texts.shapes.SERIES,
    hint: texts.shapeHints.SERIES,
    icon: "dice",
  },
];

export function matchShapeChoice(value: string): MatchShapeChoice | undefined {
  return MATCH_SHAPES.find((shape) => shape.value === value);
}

function NumberField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      <label
        className="block text-sm font-bold mb-1.5"
        style={{ color: "var(--text-main)" }}
        htmlFor={id}
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={1}
        max={40}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input"
      />
    </div>
  );
}

export default function TournamentSetupFields({
  format,
  matchShape,
  minTeamSize,
  maxTeamSize,
  organisedByHomeVillage,
  outsidePlayerLimit,
  fixturesExist = false,
  matchesPlayed = false,
  onFormat,
  onMatchShape,
  onMinTeamSize,
  onMaxTeamSize,
  onOrganisedByHomeVillage,
  onOutsidePlayerLimit,
}: {
  format: string;
  matchShape: string;
  minTeamSize: string;
  maxTeamSize: string;
  organisedByHomeVillage: boolean;
  outsidePlayerLimit: string;
  fixturesExist?: boolean;
  matchesPlayed?: boolean;
  onFormat: (format: string) => void;
  onMatchShape: (matchShape: MatchShapeValue) => void;
  onMinTeamSize: (value: string) => void;
  onMaxTeamSize: (value: string) => void;
  onOrganisedByHomeVillage: (value: boolean) => void;
  onOutsidePlayerLimit: (value: string) => void;
}) {
  const singles = isSinglesSquad({
    min: normalizePlayerCount(minTeamSize),
    max: normalizePlayerCount(maxTeamSize),
  });

  return (
    <div className="space-y-3">
      <div>
        <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
          {texts.shapeHeading}
        </p>
        <div className="space-y-1.5">
          {MATCH_SHAPES.map((shape) => (
            <label
              key={shape.value}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl ${fixturesExist ? "" : "cursor-pointer"}`}
              style={{
                background: matchShape === shape.value ? "var(--mint-100)" : "white",
                border:
                  matchShape === shape.value
                    ? "1.5px solid var(--mint-500)"
                    : "1.5px solid var(--mint-100)",
                opacity: fixturesExist && matchShape !== shape.value ? 0.55 : 1,
              }}
            >
              <input
                type="radio"
                name="tournament-match-shape"
                checked={matchShape === shape.value}
                onChange={() => onMatchShape(shape.value)}
                disabled={fixturesExist}
                className="w-4 h-4 mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold" style={{ color: "var(--text-main)" }}>
                  <IconLabel name={shape.icon}>{shape.label}</IconLabel>
                </span>
                <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {shape.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
          htmlFor="tournament-format"
        >
          {texts.formatHeading}
        </label>
        <select
          id="tournament-format"
          value={format}
          onChange={(e) => onFormat(e.target.value)}
          disabled={fixturesExist}
          className="input"
        >
          <option value="KNOCKOUT">{texts.formats.KNOCKOUT}</option>
          <option value="GROUPS_THEN_KNOCKOUT">{texts.formats.GROUPS_THEN_KNOCKOUT}</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {!singles && (
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {texts.squadHeading}
            </p>
          )}
          <label className="flex items-center gap-1.5 text-xs font-bold">
            <input
              id="tournament-singles"
              type="checkbox"
              checked={singles}
              disabled={matchesPlayed}
              onChange={(e) => {
                const one = e.target.checked ? "1" : "";
                onMinTeamSize(one);
                onMaxTeamSize(one);
              }}
            />
            <span style={{ color: "var(--text-main)" }}>{texts.singles}</span>
          </label>
        </div>
        {!singles && (
          <div className="flex gap-2">
            <NumberField
              id="tournament-min-team-size"
              label={texts.minTeamSize}
              value={minTeamSize}
              onChange={onMinTeamSize}
              disabled={matchesPlayed}
            />
            <NumberField
              id="tournament-max-team-size"
              label={texts.maxTeamSize}
              value={maxTeamSize}
              onChange={onMaxTeamSize}
              disabled={matchesPlayed}
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          id="tournament-organised-by-home-village"
          type="checkbox"
          checked={organisedByHomeVillage}
          onChange={(e) => onOrganisedByHomeVillage(e.target.checked)}
        />
        <span style={{ color: "var(--text-main)" }}>{texts.organisedByHomeVillage}</span>
      </label>

      {organisedByHomeVillage && (
        <NumberField
          id="tournament-outside-player-limit"
          label={texts.outsidePlayerLimit}
          value={outsidePlayerLimit}
          onChange={onOutsidePlayerLimit}
        />
      )}
    </div>
  );
}
