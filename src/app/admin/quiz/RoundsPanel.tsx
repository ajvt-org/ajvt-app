"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

interface RoundRow {
  index: number;
  opensAt: string;
  closesAt: string;
  loaded: number;
}

interface RoundsBody {
  rounds: RoundRow[];
  servedCount: number;
  poolSize: number;
  startedAt: string | null;
}

export default function RoundsPanel({
  competitionId,
  questionCount,
}: {
  competitionId: string;
  questionCount: number;
}) {
  const [body, setBody] = useState<RoundsBody | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [reload, setReload] = useState(0);

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
  }, [path, reload]);

  async function fill() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { filled } = await api.post<{ filled: number }>(`${path}/fill`, {});
      setNotice(`تم توزيع الأسئلة على ${filled} جولة`);
      setReload((n) => n + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (missing) return null;

  const ready = body ? body.rounds.filter((r) => r.loaded >= body.servedCount).length : 0;
  const needed = body ? body.rounds.length * body.poolSize : 0;

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="calendar">جولات المسابقة</IconLabel>
      </p>

      {body && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          جاهزة {ready} من {body.rounds.length} جولة. المخزون المطلوب {needed} سؤالاً والمتوفر{" "}
          {questionCount}.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {body?.rounds.map((d) => {
          const ok = d.loaded >= body.servedCount;
          return (
            <span
              key={d.index}
              title={`${new Date(d.opensAt).toISOString().slice(0, 16).replace("T", " ")} · ${d.loaded}`}
              className="text-xs px-2 py-1 rounded-lg font-semibold"
              style={{
                background: ok ? "var(--mint-100)" : "#fee2e2",
                color: ok ? "var(--mint-700)" : "#991b1b",
              }}
            >
              {d.index + 1}
              <span style={{ opacity: 0.7 }}> · {d.loaded}</span>
            </span>
          );
        })}
      </div>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}
      {notice && (
        <p className="text-xs font-semibold" style={{ color: "var(--mint-700)" }}>
          {notice}
        </p>
      )}

      {body && !body.startedAt && (
        <button onClick={fill} disabled={busy} className="btn btn-primary btn-sm text-xs">
          <IconLabel name="shuffle">{busy ? "..." : "توزيع الأسئلة على الجولات"}</IconLabel>
        </button>
      )}

      {body?.startedAt && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Icon name="lock" size={12} className="icon-inline" /> المسابقة انطلقت، لا يمكن تغيير
          جولاتها
        </p>
      )}
    </div>
  );
}
