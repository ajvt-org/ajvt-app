import HalfPoints from "@/components/HalfPoints";
import TeamLogo from "./TeamLogo";
import { MATCH_TEAMS_SIZES } from "./matchCard/MatchTeams";
import FollowTeamButton from "./FollowTeamButton";
import { publicTournament as texts } from "@/lib/texts";
import type { EntrantKind } from "@/lib/entrant";

type Row = {
  teamId: string;
  name: string;
  logo: string | null;
  photo?: string | null;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scoredFor: number;
  scoredAgainst: number;
  difference: number;
};

const columnTexts = texts.standingsColumns;

function columnsFor(series: boolean): { label: string; detail: boolean; start?: boolean }[] {
  return [
    { label: columnTexts.rank, detail: false },
    { label: "", detail: false, start: true },
    { label: columnTexts.points, detail: false },
    { label: columnTexts.played, detail: false },
    { label: columnTexts.won, detail: true },
    { label: columnTexts.drawn, detail: true },
    { label: columnTexts.lost, detail: true },
    { label: series ? columnTexts.partsFor : columnTexts.goalsFor, detail: true },
    { label: series ? columnTexts.partsAgainst : columnTexts.goalsAgainst, detail: true },
    { label: series ? columnTexts.partDifference : columnTexts.goalDifference, detail: false },
  ];
}

export default function StandingsTable({
  title,
  rows,
  showFollow,
  series = false,
  entrant = "team",
}: {
  title: string | null;
  rows: Row[];
  showFollow: boolean;
  series?: boolean;
  entrant?: EntrantKind;
}) {
  const columns = columnsFor(series).map((column) =>
    column.start ? { ...column, label: texts.entrant[entrant].column } : column,
  );
  const count = (value: number) => (series ? <HalfPoints halves={value} /> : value);

  return (
    <div className="card table-fit overflow-x-auto">
      {title && (
        <p className="text-sm font-bold px-3 pt-3" style={{ color: "var(--text-main)" }}>
          {title}
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--mint-100)" }}>
            {columns.map((column) => (
              <th
                key={column.label}
                className={`px-2 py-2 font-bold${column.start ? " text-start" : " text-center"}${column.detail ? " col-detail" : ""}`}
                style={{ color: "var(--mint-700)" }}
              >
                {column.label}
              </th>
            ))}
            {showFollow && <th className="px-2 py-2" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.teamId} style={{ borderTop: "1px solid var(--mint-100)" }}>
              <td className="px-2 py-2 text-center">{i + 1}</td>
              <td className="px-2 py-2 font-bold text-xs" style={{ color: "var(--text-main)" }}>
                <span className="flex items-center gap-1.5 justify-start">
                  <TeamLogo
                    logo={row.logo}
                    photo={row.photo}
                    name={row.name}
                    size={MATCH_TEAMS_SIZES.sm.logo}
                    entrant={entrant}
                  />
                  <bdi style={{ overflowWrap: "anywhere" }}>{row.name}</bdi>
                </span>
              </td>
              <td className="px-2 py-2 text-center font-black" style={{ color: "var(--mint-700)" }}>
                {count(row.points)}
              </td>
              <td className="px-2 py-2 text-center">{row.played}</td>
              <td className="px-2 py-2 text-center col-detail">{row.won}</td>
              <td className="px-2 py-2 text-center col-detail">{row.drawn}</td>
              <td className="px-2 py-2 text-center col-detail">{row.lost}</td>
              <td className="px-2 py-2 text-center col-detail">{count(row.scoredFor)}</td>
              <td className="px-2 py-2 text-center col-detail">{count(row.scoredAgainst)}</td>
              <td className="px-2 py-2 text-center" dir="ltr">
                {count(row.difference)}
              </td>
              {showFollow && (
                <td className="px-2 py-2 text-center">
                  <FollowTeamButton teamId={row.teamId} entrant={entrant} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
