"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Scoreline from "@/components/tournament/Scoreline";
import { forfeitScore } from "@/lib/forfeit";
import { matchAdmin as texts } from "@/lib/texts";

const AMBER_BG = "#fffbeb";
const AMBER_LINE = "#fcd34d";
const AMBER_INK = "#92400e";

export default function ForfeitToggle({
  sides,
  homeTeamId,
  scored,
  winnerTeamId,
  onChange,
}: {
  sides: { id: string; name: string }[];
  homeTeamId: string;
  scored: { home: number; away: number };
  winnerTeamId: string | null;
  onChange: (winnerTeamId: string | null) => void;
}) {
  const on = winnerTeamId !== null;
  const awarded = winnerTeamId ? forfeitScore(scored, winnerTeamId, homeTeamId) : null;

  return (
    <div
      className="rounded-xl p-3 space-y-2.5"
      style={{ background: on ? AMBER_BG : "white", border: `1px solid ${AMBER_LINE}` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold" style={{ color: AMBER_INK }}>
          <IconLabel name="warning">{texts.forfeitHeading}</IconLabel>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={texts.forfeitHeading}
          onClick={() => onChange(on ? null : sides[0].id)}
          className="rounded-full shrink-0"
          style={{
            width: 46,
            height: 26,
            padding: 3,
            background: on ? AMBER_LINE : "var(--mint-100)",
            transition: "background 120ms",
          }}
        >
          <span
            className="block rounded-full"
            style={{
              width: 20,
              height: 20,
              background: "white",
              transform: on ? "translateX(-20px)" : "translateX(0)",
              transition: "transform 120ms",
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            }}
          />
        </button>
      </div>

      <p className="text-xs" style={{ color: on ? AMBER_INK : "var(--text-muted)" }}>
        {texts.forfeitHint}
      </p>

      {on && (
        <>
          <p className="text-xs font-bold" style={{ color: AMBER_INK }}>
            {texts.forfeitPickWinner}
          </p>
          <div className="flex gap-2">
            {sides.map((team) => {
              const picked = team.id === winnerTeamId;
              return (
                <button
                  key={team.id}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => onChange(team.id)}
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-bold"
                  style={{
                    background: picked ? AMBER_INK : "white",
                    color: picked ? "white" : AMBER_INK,
                    border: `1px solid ${picked ? AMBER_INK : AMBER_LINE}`,
                  }}
                >
                  {picked && <Icon name="check" size={12} />} <bdi>{team.name}</bdi>
                </button>
              );
            })}
          </div>

          {awarded && (
            <p className="text-sm font-black text-center" style={{ color: AMBER_INK }}>
              {texts.forfeitAwarded} <Scoreline home={awarded.home} away={awarded.away} />
            </p>
          )}

          <p className="text-xs" style={{ color: AMBER_INK }}>
            {texts.forfeitKeptGoals}
          </p>
        </>
      )}
    </div>
  );
}
