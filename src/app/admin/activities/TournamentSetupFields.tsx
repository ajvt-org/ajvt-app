"use client";

import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";

export interface TournamentPreset {
  value: string;
  label: string;
  hint: string;
  icon: IconName;
  profile: string;
  teamSize: string;
}

export const TOURNAMENT_PRESETS: TournamentPreset[] = [
  {
    value: "football",
    label: "بطولة فرق",
    hint: "كرة القدم ونحوها — أهداف وبطاقات وهدافون",
    icon: "ball",
    profile: "FOOTBALL",
    teamSize: "",
  },
  {
    value: "board",
    label: "بطولة فردية",
    hint: "شطرنج، دامة، بلايستيشن — نتيجة فقط، كل مشارك يلعب لنفسه",
    icon: "user",
    profile: "BOARD",
    teamSize: "1",
  },
  {
    value: "cards",
    label: "بطولة أزواج",
    hint: "لعب الورق — نتيجة فقط، كل فريق لاعبان اثنان",
    icon: "users",
    profile: "BOARD",
    teamSize: "2",
  },
];

export function presetOf(profile: string, teamSize: string): string {
  if (profile === "BOARD") return teamSize === "2" ? "cards" : "board";
  return "football";
}

export default function TournamentSetupFields({
  format,
  profile,
  teamSize,
  onFormat,
  onPreset,
}: {
  format: string;
  profile: string;
  teamSize: string;
  onFormat: (format: string) => void;
  onPreset: (preset: TournamentPreset) => void;
}) {
  const selected = presetOf(profile, teamSize);

  return (
    <div className="space-y-3">
      <div>
        <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
          نوع البطولة
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
              <span className="min-w-0">
                <span className="block text-sm font-bold" style={{ color: "var(--text-main)" }}>
                  <IconLabel name={preset.icon}>{preset.label}</IconLabel>
                </span>
                <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                  {preset.hint}
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
          نظام البطولة
        </label>
        <select
          id="tournament-format"
          value={format}
          onChange={(e) => onFormat(e.target.value)}
          className="input"
        >
          <option value="KNOCKOUT">خروج المغلوب مباشرة</option>
          <option value="GROUPS_THEN_KNOCKOUT">مجموعات ثم خروج المغلوب</option>
        </select>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          لا يمكن تغييره بعد إنشاء المباريات.
        </p>
      </div>
    </div>
  );
}
