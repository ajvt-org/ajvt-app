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

export default function TournamentSetupFields({
  format,
  profile,
  maxTeamSize,
  onFormat,
  onPreset,
}: {
  format: string;
  profile: string;
  maxTeamSize: string;
  onFormat: (format: string) => void;
  onPreset: (preset: TournamentPreset) => void;
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
    </div>
  );
}
