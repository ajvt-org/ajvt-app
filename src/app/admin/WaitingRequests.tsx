"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import { push } from "@/lib/messages";
import { countedNoun, DAYS } from "@/lib/arabicPlural";
import type { WaitingRow } from "@/lib/waitingRequests";

interface Waiting {
  days: number;
  pending: WaitingRow[];
  unfinished: WaitingRow[];
}

function Row({
  row,
  kind,
  href,
  onChased,
}: {
  row: WaitingRow;
  kind: "pending" | "unfinished";
  href: string | null;
  onChased: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function chase() {
    if (!row.userId) return;
    setBusy(true);
    try {
      await api.post("/api/admin/waiting/chase", { userId: row.userId, kind });
      setDone(true);
      onChased(row.id);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="min-w-0">
        {href ? (
          <Link href={href} className="text-sm font-bold truncate block">
            {row.name}
          </Link>
        ) : (
          <span className="text-sm font-bold truncate block">{row.name}</span>
        )}
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          منذ {countedNoun(row.days, DAYS)}
        </span>
      </div>
      {done ? (
        <span className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
          {push.chaseSent}
        </span>
      ) : (
        <button
          onClick={chase}
          disabled={busy || !row.userId}
          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="bell">تذكير</IconLabel>
        </button>
      )}
    </div>
  );
}

export default function WaitingRequests() {
  const [data, setData] = useState<Waiting | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<Waiting>("/api/admin/waiting")
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;
  const total = data.pending.length + data.unfinished.length;
  if (total === 0) return null;

  return (
    <div className="card p-4">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="hourglass">ينتظر أكثر من {countedNoun(data.days, DAYS)}</IconLabel>
      </p>
      <div className="mt-2 divide-y" style={{ borderColor: "var(--mint-100)" }}>
        {data.pending.map((row) => (
          <Row
            key={row.id}
            row={row}
            kind="pending"
            href={`/admin/members/${row.id}`}
            onChased={() => {}}
          />
        ))}
        {data.unfinished.map((row) => (
          <Row key={row.id} row={row} kind="unfinished" href={null} onChased={() => {}} />
        ))}
      </div>
    </div>
  );
}
