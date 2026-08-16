"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

type Reuse = { kind: "member" | "donation" | "expense"; id: string; label: string; date: string };

const WHERE: Record<Reuse["kind"], string> = {
  member: "طلب عضوية",
  donation: "تبرع",
  expense: "مصروف",
};

// Sits under the screenshot an admin is about to judge. It says only what it
// can prove — the same image, byte for byte, is already on another record —
// and names that record so the two can be compared before accepting.
export default function ProofReuseWarning({
  filename,
  kind,
  id,
}: {
  filename: string | null;
  kind: Reuse["kind"];
  id: string;
}) {
  // The answer is kept next to the screenshot it belongs to, so moving to
  // another member shows nothing rather than the previous member's warning
  // while its own request is still in the air.
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
    <div
      className="card p-3 mt-2 text-xs space-y-1"
      style={{ background: "#fef3c7", border: "1px solid #f59e0b" }}
    >
      <p className="font-black" style={{ color: "#92400e" }}>
        <Icon name="warning" size={13} className="icon-inline" /> نفس الكابتير مستعمل من قبل
      </p>
      <ul className="space-y-0.5" style={{ color: "#92400e" }}>
        {reuse.map((row) => (
          <li key={`${row.kind}-${row.id}`}>
            {WHERE[row.kind]}: <b>{row.label}</b>{" "}
            <span dir="ltr">({new Date(row.date).toISOString().slice(0, 10)})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
