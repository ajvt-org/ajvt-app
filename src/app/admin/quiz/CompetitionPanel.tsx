"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import ConfirmAction from "./ConfirmAction";
import { DEFAULT_BANDS } from "@/lib/competitionConfig";
import type { Competition } from "./competitionTypes";
import CompetitionFields, { type Draft } from "./CompetitionFields";

const EMPTY: Draft = {
  name: "",
  startsAt: "",
  roundCount: 30,
  roundPeriodMinutes: 1440,
  roundWindowMinutes: 840,
  servedCount: 10,
  poolSize: 30,
  groupSize: 7,
  countingRounds: 6,
  speedBands: DEFAULT_BANDS,
};

export default function CompetitionPanel() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<"start" | "reset" | null>(null);

  const locked = startedAt !== null;

  function apply(competition: Competition) {
    const { id, startedAt: at, ...rest } = competition;
    void id;
    setDraft(rest);
    setStartedAt(at);
    setExists(true);
  }

  async function load() {
    const data = await api.get<{ competition: Competition | null }>("/api/admin/quiz/competition");
    if (data.competition) apply(data.competition);
  }

  useEffect(() => {
    let alive = true;
    api
      .get<{ competition: Competition | null }>("/api/admin/quiz/competition")
      .then((data) => {
        if (alive && data.competition) apply(data.competition);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setNotice("");
  }

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.put("/api/admin/quiz/competition", draft);
      setExists(true);
      setNotice("تم الحفظ");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function act(what: "start" | "reset") {
    setBusy(true);
    setError("");
    try {
      if (what === "start") {
        await api.post("/api/admin/quiz/competition/start", {});
      } else {
        await api.del("/api/admin/quiz/competition");
        setNotice("تم تصفير النقاط");
      }
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="trophy">المسابقة</IconLabel>
      </p>

      {locked && (
        <p
          className="text-xs font-semibold rounded-lg p-2"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          المسابقة انطلقت، الإعدادات مغلقة
        </p>
      )}

      <CompetitionFields draft={draft} locked={locked} onChange={set} />

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

      {!locked && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={save} disabled={busy} className="btn btn-primary btn-sm text-xs">
            <IconLabel name="save">حفظ الإعدادات</IconLabel>
          </button>
          {exists && (
            <>
              <button
                onClick={() => setConfirming("start")}
                disabled={busy}
                className="btn btn-sm text-xs"
                style={{ background: "var(--mint-700)", color: "white" }}
              >
                إطلاق المسابقة
              </button>
              <button
                onClick={() => setConfirming("reset")}
                disabled={busy}
                className="btn btn-sm text-xs"
                style={{ background: "#fee2e2", color: "#991b1b" }}
              >
                تصفير النقاط
              </button>
            </>
          )}
        </div>
      )}

      {confirming === "start" && (
        <ConfirmAction
          title="إطلاق المسابقة"
          message="بعد الإطلاق لا يمكن تعديل أي إعداد ولا تصفير النقاط. هل أنت متأكد؟"
          confirmLabel="إطلاق"
          loading={busy}
          onConfirm={() => act("start")}
          onClose={() => setConfirming(null)}
        />
      )}
      {confirming === "reset" && (
        <ConfirmAction
          title="تصفير النقاط"
          message="سيتم تصفير نقاط كل المشاركين. هذا ممكن فقط قبل انطلاق المسابقة."
          confirmLabel="تصفير"
          danger
          loading={busy}
          onConfirm={() => act("reset")}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
