"use client";

import { useMemo, useState } from "react";
import {
  AGE_SORTS,
  DEFAULT_AGE_SORT,
  sortStandings,
  type AgeSortKey,
  type AgeStanding,
} from "@/lib/ageStandings";
import { counted } from "@/lib/arabicCount";
import { ACCOUNT, SUBSCRIBER } from "@/lib/messages";

const MEDALS = ["#d4af37", "#9aa3ab", "#c07a3e"];

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1">
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "var(--mint-100)" }}
        role="img"
        aria-label={`${label} ${value}٪`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: "var(--mint-600)" }}
        />
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label} {value}٪
      </p>
    </div>
  );
}

function Row({ entry, mine, sort }: { entry: AgeStanding; mine: boolean; sort: AgeSortKey }) {
  const medal = MEDALS[entry.rank - 1];
  const accounts = sort === "users" || sort === "userRate";

  return (
    <div
      className="card p-4 space-y-2.5"
      style={
        mine ? { background: "var(--mint-50)", border: "1.5px solid var(--mint-500)" } : undefined
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black"
            style={{
              background: medal ?? "var(--mint-100)",
              color: medal ? "#fff" : "var(--mint-700)",
            }}
          >
            <span className="badge-numeral">{entry.rank}</span>
          </span>
          <p className="font-bold truncate" style={{ color: "var(--text-main)" }}>
            {entry.name}
            {mine && (
              <span
                className="expense-tag mr-1.5"
                style={{ background: "var(--mint-600)", color: "white" }}
              >
                عصرك
              </span>
            )}
          </p>
        </div>
        <span className="font-black shrink-0" style={{ color: "var(--mint-700)" }}>
          {accounts ? entry.users : entry.members} / {entry.total}
        </span>
      </div>

      <Bar
        value={accounts ? entry.userRate : entry.rate}
        label={accounts ? "نسبة الحسابات" : "نسبة الانتساب"}
      />

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {accounts
          ? `${counted(entry.members, SUBSCRIBER)} من أصل ${entry.total}`
          : `${counted(entry.users, ACCOUNT)} على التطبيق`}
      </p>
    </div>
  );
}

export default function AgeStandingsTable({
  standings,
  mine,
}: {
  standings: AgeStanding[];
  mine?: string | null;
}) {
  const [sort, setSort] = useState<AgeSortKey>(DEFAULT_AGE_SORT);
  const rows = useMemo(() => sortStandings(standings, sort), [standings, sort]);

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="age-sort"
          className="block text-xs font-bold mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          الترتيب حسب
        </label>
        <select
          id="age-sort"
          className="input"
          value={sort}
          onChange={(e) => setSort(e.target.value as AgeSortKey)}
        >
          {AGE_SORTS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {rows.map((entry) => (
        <Row key={entry.name} entry={entry} mine={!!mine && entry.name === mine} sort={sort} />
      ))}
    </div>
  );
}
