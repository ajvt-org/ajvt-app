"use client";

import IconLabel from "@/components/IconLabel";
import { tournamentSetup as texts } from "@/lib/texts";
import type { IconName } from "@/components/Icon";

export interface TournamentPreset {
  value: string;
  label: string;
  icon: IconName;
  profile: string;
  minTeamSize: string;
  maxTeamSize: string;
}

export const TOURNAMENT_PRESETS: TournamentPreset[] = [
  {
    value: "football",
    label: texts.presets.football,
    icon: "ball",
    profile: "FOOTBALL",
    minTeamSize: "",
    maxTeamSize: "",
  },
  {
    value: "board",
    label: texts.presets.board,
    icon: "user",
    profile: "BOARD",
    minTeamSize: "1",
    maxTeamSize: "1",
  },
  {
    value: "cards",
    label: texts.presets.cards,
    icon: "users",
    profile: "BOARD",
    minTeamSize: "2",
    maxTeamSize: "2",
  },
];

export function presetOf(profile: string, maxTeamSize: string): string {
  if (profile === "BOARD") return maxTeamSize === "2" ? "cards" : "board";
  return "football";
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        className="input"
      />
    </div>
  );
}

export default function TournamentSetupFields({
  format,
  profile,
  minTeamSize,
  maxTeamSize,
  organisedByTaguilalett,
  outsidePlayerLimit,
  onFormat,
  onPreset,
  onMinTeamSize,
  onMaxTeamSize,
  onOrganisedByTaguilalett,
  onOutsidePlayerLimit,
}: {
  format: string;
  profile: string;
  minTeamSize: string;
  maxTeamSize: string;
  organisedByTaguilalett: boolean;
  outsidePlayerLimit: string;
  onFormat: (format: string) => void;
  onPreset: (preset: TournamentPreset) => void;
  onMinTeamSize: (value: string) => void;
  onMaxTeamSize: (value: string) => void;
  onOrganisedByTaguilalett: (value: boolean) => void;
  onOutsidePlayerLimit: (value: string) => void;
}) {
  const selected = presetOf(profile, maxTeamSize);

  return (
    <div className="space-y-3">
      <div>
        <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
          {texts.presetHeading}
        </p>
        <div className="space-y-1.5">
          {TOURNAMENT_PRESETS.map((preset) => (
            <label
              key={preset.value}
              className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer"
              style={{
                background: selected === preset.value ? "var(--mint-100)" : "white",
                border:
                  selected === preset.value
                    ? "1.5px solid var(--mint-500)"
                    : "1.5px solid var(--mint-100)",
              }}
            >
              <input
                type="radio"
                name="tournament-preset"
                checked={selected === preset.value}
                onChange={() => onPreset(preset)}
                className="w-4 h-4"
              />
              <span className="min-w-0 text-sm font-bold" style={{ color: "var(--text-main)" }}>
                <IconLabel name={preset.icon}>{preset.label}</IconLabel>
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
          className="input"
        >
          <option value="KNOCKOUT">{texts.formats.KNOCKOUT}</option>
          <option value="GROUPS_THEN_KNOCKOUT">{texts.formats.GROUPS_THEN_KNOCKOUT}</option>
        </select>
      </div>

      <div>
        <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
          {texts.squadHeading}
        </p>
        <div className="flex gap-2">
          <NumberField
            id="tournament-min-team-size"
            label={texts.minTeamSize}
            value={minTeamSize}
            onChange={onMinTeamSize}
          />
          <NumberField
            id="tournament-max-team-size"
            label={texts.maxTeamSize}
            value={maxTeamSize}
            onChange={onMaxTeamSize}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          id="tournament-organised-by-taguilalett"
          type="checkbox"
          checked={organisedByTaguilalett}
          onChange={(e) => onOrganisedByTaguilalett(e.target.checked)}
        />
        <span style={{ color: "var(--text-main)" }}>{texts.organisedByTaguilalett}</span>
      </label>

      {organisedByTaguilalett && (
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
