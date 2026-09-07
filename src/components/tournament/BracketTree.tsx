import BracketConnectors from "@/components/tournament/BracketConnectors";
import BracketMatchCard, { type BracketMatch } from "@/components/tournament/BracketMatchCard";
import { COLUMN_GAP, COLUMN_WIDTH, bracketHeight, bracketTops } from "@/lib/bracketLayout";
import { bracketRounds } from "@/lib/bracketRounds";
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

  const rounds = bracketRounds(matches, texts.bracketRound);
  const tops = bracketTops(rounds.map((round) => round.matches.length));
  const height = bracketHeight(tops);

  return (
    <div className="bracket-scroller" dir="ltr">
      <div
        className="bracket-rounds"
        style={
          {
            "--bracket-height": `${height}px`,
            "--bracket-column": `${COLUMN_WIDTH}px`,
            "--bracket-gap": `${COLUMN_GAP}px`,
          } as React.CSSProperties
        }
      >
        {rounds.map((round, index) => (
          <div key={round.number} className="bracket-round">
            <p
              className="bracket-round-name text-xs font-bold mb-2"
              style={{ color: "var(--mint-700)" }}
              dir="rtl"
            >
              {round.label}
            </p>
            <div className="bracket-slots">
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
