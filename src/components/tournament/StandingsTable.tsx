import TeamLogo from "./TeamLogo";
import { matchDisplay } from "@/lib/texts";
import FollowTeamButton from "./FollowTeamButton";

type Row = {
  teamId: string;
  name: string;
  logo: string | null;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  unresolved?: boolean;
};

const COLUMNS: { label: string; detail: boolean; start?: boolean }[] = [
  { label: "#", detail: false },
  { label: "الفريق", detail: false, start: true },
  { label: "نقاط", detail: false },
  { label: "لعب", detail: false },
  { label: "فاز", detail: true },
  { label: "تعادل", detail: true },
  { label: "خسر", detail: true },
  { label: "له", detail: true },
  { label: "عليه", detail: true },
  { label: "الفرق", detail: false },
];

export default function StandingsTable({
  title,
  rows,
  showFollow,
}: {
  title: string | null;
  rows: Row[];
  showFollow: boolean;
}) {
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
            {COLUMNS.map((column) => (
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
                  <TeamLogo logo={row.logo} name={row.name} size={18} />
                  <bdi style={{ overflowWrap: "anywhere" }}>{row.name}</bdi>
                  {row.unresolved && (
                    <span
                      className="badge shrink-0"
                      title={matchDisplay.tieUnresolved}
                      style={{ background: "#fef3c7", color: "#92400e" }}
                    >
                      {matchDisplay.tieMark}
                    </span>
                  )}
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
                  <FollowTeamButton teamId={row.teamId} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
