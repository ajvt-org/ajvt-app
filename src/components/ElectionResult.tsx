"use client";

import Icon from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import { leader, percentOf, rankedTally } from "@/lib/election";
import { electionResult as texts } from "@/lib/texts";

export interface ElectionTallyRow {
  candidateId: string | null;
  fullName: string;
  photo: string | null;
  votes: number;
}

export interface ElectionResultData {
  electorate: number;
  cast: number;
  blank: number;
  rows: { candidateId: string; fullName: string; photo: string | null; votes: number }[];
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-lg font-black tabular-nums" style={{ color: "var(--text-main)" }}>
        <NumericRanges>{value}</NumericRanges>
      </p>
    </div>
  );
}

export default function ElectionResult({
  result,
  allowBlank,
}: {
  result: ElectionResultData;
  allowBlank: boolean;
}) {
  const withBlank: ElectionTallyRow[] = [
    ...result.rows,
    ...(allowBlank || result.blank > 0
      ? [{ candidateId: null, fullName: texts.blank, photo: null, votes: result.blank }]
      : []),
  ];
  const rows = rankedTally(withBlank);
  const first = leader(withBlank);

  return (
    <div className="card p-4 space-y-4">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        {texts.heading}
      </p>

      <div className="flex items-start gap-4 flex-wrap">
        <Figure label={texts.cast} value={`${result.cast}`} />
        <Figure label={texts.electorate} value={`${result.electorate}`} />
        <Figure label={texts.turnout} value={`${percentOf(result.cast, result.electorate)}%`} />
      </div>

      {result.cast === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.noBallots}
        </p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => {
            const share = percentOf(row.votes, result.cast);
            const top = row.candidateId !== null && row.candidateId === first;
            return (
              <div key={row.candidateId ?? "blank"}>
                <div className="flex items-start justify-between gap-2 text-xs mb-1">
                  <span
                    className="flex items-center gap-1.5 min-w-0"
                    style={{
                      color: "var(--text-main)",
                      fontWeight: top ? 800 : 500,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {top && (
                      <Icon name="medal" size={14} className="shrink-0" color="var(--copper-500)" />
                    )}
                    {row.fullName}
                  </span>
                  <span className="shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
                    <NumericRanges>{`${row.votes} (${share}%)`}</NumericRanges>
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--mint-100)" }}
                >
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${share}%`,
                      background: top ? "var(--copper-500)" : "var(--mint-500)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
