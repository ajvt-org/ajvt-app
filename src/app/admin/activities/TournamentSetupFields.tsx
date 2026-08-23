"use client";

import IconLabel from "@/components/IconLabel";
import type { IconName } from "@/components/Icon";

export const PARTICIPANT_CHOICES: {
  value: string;
  label: string;
  hint: string;
  icon: IconName;
}[] = [
  { value: "", label: "فرق", hint: "كرة القدم ونحوها — كل فريق عدة لاعبين", icon: "shield" },
  {
    value: "1",
    label: "لاعبون فرادى",
    hint: "شطرنج، دامة، بلايستيشن — كل مشارك لنفسه",
    icon: "user",
  },
  { value: "2", label: "أزواج", hint: "لعب الورق — كل فريق لاعبان اثنان", icon: "users" },
];

export default function TournamentSetupFields({
  format,
  teamSize,
  onFormat,
  onTeamSize,
}: {
  format: string;
  teamSize: string;
  onFormat: (format: string) => void;
  onTeamSize: (teamSize: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
          من يتنافس؟
        </p>
        <div className="space-y-1.5">
          {PARTICIPANT_CHOICES.map((choice) => (
            <label
              key={choice.value}
              className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer"
              style={{
                background: teamSize === choice.value ? "var(--mint-100)" : "white",
                border:
                  teamSize === choice.value
                    ? "1.5px solid var(--mint-500)"
                    : "1.5px solid var(--mint-100)",
              }}
            >
              <input
                type="radio"
                name="tournament-participants"
                checked={teamSize === choice.value}
                onChange={() => onTeamSize(choice.value)}
                className="w-4 h-4"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold" style={{ color: "var(--text-main)" }}>
                  <IconLabel name={choice.icon}>{choice.label}</IconLabel>
                </span>
                <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                  {choice.hint}
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
