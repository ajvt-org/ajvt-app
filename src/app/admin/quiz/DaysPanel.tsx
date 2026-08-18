"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

interface DayRow {
  day: string;
  index: number;
  loaded: number;
}

interface DaysBody {
  days: DayRow[];
  servedCount: number;
  poolSize: number;
  startedAt: string | null;
}

export default function DaysPanel({ questionCount }: { questionCount: number }) {
  const [body, setBody] = useState<DaysBody | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  async function load() {
    try {
      setBody(await api.get<DaysBody>("/api/admin/quiz/days"));
      setMissing(false);
    } catch {
      setMissing(true);
    }
  }

  useEffect(() => {
    let alive = true;
    api
      .get<DaysBody>("/api/admin/quiz/days")
      .then((data) => {
        if (alive) setBody(data);
      })
      .catch(() => {
        if (alive) setMissing(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function fill() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { filled } = await api.post<{ filled: number }>("/api/admin/quiz/days/fill", {});
      setNotice(`تم توزيع الأسئلة على ${filled} يوماً`);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (missing) return null;

  const ready = body ? body.days.filter((d) => d.loaded >= body.servedCount).length : 0;
  const needed = body ? body.days.length * body.poolSize : 0;

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="calendar">أيام المسابقة</IconLabel>
      </p>

      {body && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          جاهز {ready} من {body.days.length} يوماً. المخزون المطلوب {needed} سؤالاً والمتوفر{" "}
          {questionCount}.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {body?.days.map((d) => {
          const ok = d.loaded >= body.servedCount;
          return (
            <span
              key={d.day}
              title={`${d.day} — ${d.loaded}`}
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
          <IconLabel name="shuffle">{busy ? "..." : "توزيع الأسئلة على الأيام"}</IconLabel>
        </button>
      )}

      {body?.startedAt && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Icon name="lock" size={12} className="icon-inline" /> المسابقة انطلقت، لا يمكن تغيير
          أيامها
        </p>
      )}
    </div>
  );
}
