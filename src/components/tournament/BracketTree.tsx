import BracketConnectors from "@/components/tournament/BracketConnectors";
import BracketMatchCard, { type BracketMatch } from "@/components/tournament/BracketMatchCard";
import { COLUMN_GAP, COLUMN_WIDTH, bracketHeight, bracketTops } from "@/lib/bracketLayout";
import { publicTournament as texts } from "@/lib/texts";
import type { EntrantKind } from "@/lib/entrant";

export type { BracketMatch };

export default function BracketTree({
  matches,
  entrant = "team",
}: {
  matches: BracketMatch[];
  entrant?: EntrantKind;
}) {
  if (matches.length === 0) return null;

  const roundNumbers = Array.from(new Set(matches.map((m) => m.bracketRound))).sort(
    (a, b) => a - b,
  );
  const rounds = roundNumbers.map((n) => ({
    number: n,
    label: matches.find((m) => m.bracketRound === n)?.round || texts.bracketRound(n),
    matches: matches.filter((m) => m.bracketRound === n).sort((a, b) => a.order - b.order),
  }));

  const tops = bracketTops(rounds.map((round) => round.matches.length));
  const height = bracketHeight(tops);

  return (
    <div className="overflow-x-auto pb-2" dir="ltr">
      <div className="flex" style={{ minWidth: "fit-content", gap: COLUMN_GAP }}>
        {rounds.map((round, index) => (
          <div key={round.number} className="flex flex-col" style={{ width: COLUMN_WIDTH }}>
            <p
              className="text-xs font-bold text-center mb-2"
              style={{ color: "var(--mint-700)" }}
              dir="rtl"
            >
              {round.label}
            </p>
            <div className="relative" style={{ height }}>
              <BracketConnectors
                feederTops={tops[index - 1] ?? []}
                tops={tops[index]}
                height={height}
              />
              {round.matches.map((m, position) => (
                <BracketMatchCard
                  key={m.id}
                  match={m}
                  top={tops[index][position]}
                  entrant={entrant}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
