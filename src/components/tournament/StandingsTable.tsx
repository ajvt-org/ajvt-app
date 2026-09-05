import TeamLogo from "./TeamLogo";
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
  gf: number;
  ga: number;
  gd: number;
};

const columnTexts = texts.standingsColumns;

const COLUMNS: { label: string; detail: boolean; start?: boolean }[] = [
  { label: columnTexts.rank, detail: false },
  { label: "", detail: false, start: true },
  { label: columnTexts.points, detail: false },
  { label: columnTexts.played, detail: false },
  { label: columnTexts.won, detail: true },
  { label: columnTexts.drawn, detail: true },
  { label: columnTexts.lost, detail: true },
  { label: columnTexts.goalsFor, detail: true },
  { label: columnTexts.goalsAgainst, detail: true },
  { label: columnTexts.goalDifference, detail: false },
];

export default function StandingsTable({
  title,
  rows,
  showFollow,
  entrant = "team",
}: {
  title: string | null;
  rows: Row[];
  showFollow: boolean;
  entrant?: EntrantKind;
}) {
  const columns = COLUMNS.map((column) =>
    column.start ? { ...column, label: texts.entrant[entrant].column } : column,
  );

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
                    size={18}
                    entrant={entrant}
                  />
                  <bdi style={{ overflowWrap: "anywhere" }}>{row.name}</bdi>
                </span>
              </td>
              <td className="px-2 py-2 text-center font-black" style={{ color: "var(--mint-700)" }}>
                {row.points}
              </td>
              <td className="px-2 py-2 text-center">{row.played}</td>
              <td className="px-2 py-2 text-center col-detail">{row.won}</td>
              <td className="px-2 py-2 text-center col-detail">{row.drawn}</td>
              <td className="px-2 py-2 text-center col-detail">{row.lost}</td>
              <td className="px-2 py-2 text-center col-detail">{row.gf}</td>
              <td className="px-2 py-2 text-center col-detail">{row.ga}</td>
              <td className="px-2 py-2 text-center" dir="ltr">
                {row.gd}
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
