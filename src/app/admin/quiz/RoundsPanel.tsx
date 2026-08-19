"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

interface RoundRow {
  index: number;
  opensAt: string;
  closesAt: string;
  category: string | null;
  loaded: number;
}

interface RoundsBody {
  rounds: RoundRow[];
  bankSize: number;
  plannable: number;
  servedCount: number;
  startedAt: string | null;
}

export default function RoundsPanel({ competitionId }: { competitionId: string }) {
  const [body, setBody] = useState<RoundsBody | null>(null);
  const [missing, setMissing] = useState(false);

  const path = `/api/admin/quiz/competitions/${competitionId}/rounds`;

  useEffect(() => {
    let alive = true;
    api
      .get<RoundsBody>(path)
      .then((data) => {
        if (!alive) return;
        setBody(data);
        setMissing(false);
      })
      .catch(() => {
        if (alive) setMissing(true);
      });
    return () => {
      alive = false;
    };
  }, [path]);

  if (missing || !body) return null;

  const total = body.rounds.length;
  const needed = total * body.servedCount;
  const short = body.plannable < total;

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="calendar">جولات المسابقة</IconLabel>
      </p>

      {!body.startedAt && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          تُسحب أسئلة كل جولة من البنك عند الانطلاق. البنك يغطي {body.plannable} من {total} جولة،
          المطلوب {needed} سؤالاً والمتوفر {body.bankSize}.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {body.rounds.map((d) => {
          const ok = body.startedAt ? d.loaded >= body.servedCount : d.index < body.plannable;
          return (
            <span
              key={d.index}
              title={`${new Date(d.opensAt).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" })} · ${d.category ?? "كل التصنيفات"}`}
              className="text-xs px-2 py-1 rounded-lg font-semibold"
              style={{
                background: ok ? "var(--mint-100)" : "#fee2e2",
                color: ok ? "var(--mint-700)" : "#991b1b",
              }}
            >
              {d.index + 1}
              {d.category && <span style={{ opacity: 0.7 }}> · {d.category}</span>}
            </span>
          );
        })}
      </div>

      {!body.startedAt && short && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          البنك لا يكفي لكل الجولات، لن تنطلق المسابقة قبل اكتمال المخزون
        </p>
      )}

      {body.startedAt && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Icon name="lock" size={12} className="icon-inline" /> المسابقة انطلقت، لا يمكن تغيير
          جولاتها
        </p>
      )}
    </div>
  );
}
