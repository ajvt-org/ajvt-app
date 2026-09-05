"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { proofReuse as texts } from "@/lib/texts";

type Reuse = { kind: "member" | "donation" | "expense"; id: string; label: string; date: string };

const WHERE: Record<Reuse["kind"], string> = {
  member: texts.member,
  donation: texts.donation,
  expense: texts.expense,
};

export default function ProofReuseWarning({
  filename,
  kind,
  id,
}: {
  filename: string | null;
  kind: Reuse["kind"];
  id: string;
}) {
  const [answer, setAnswer] = useState<{ filename: string; rows: Reuse[] } | null>(null);

  useEffect(() => {
    if (!filename) return;
    const params = new URLSearchParams({ filename, kind, id });
    let cancelled = false;
    fetch(`/api/admin/proof-reuse?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.reuse) setAnswer({ filename, rows: data.reuse });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [filename, kind, id]);

  const reuse = answer && answer.filename === filename ? answer.rows : [];
  if (reuse.length === 0) return null;

  return (
    <details
      className="card p-2 mt-2 text-xs"
      style={{ background: "#fef3c7", border: "1px solid #f59e0b" }}
    >
      <summary className="font-black cursor-pointer select-none" style={{ color: "#92400e" }}>
        <Icon name="warning" size={13} className="icon-inline" /> {texts.title}
      </summary>
      <ul className="space-y-0.5 mt-1" style={{ color: "#92400e" }}>
        {reuse.map((row) => (
          <li key={`${row.kind}-${row.id}`}>
            {WHERE[row.kind]} <b>{row.label}</b>{" "}
            <span dir="ltr">({new Date(row.date).toISOString().slice(0, 10)})</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
