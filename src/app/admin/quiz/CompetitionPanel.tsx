"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import ConfirmAction from "./ConfirmAction";
import { DEFAULT_CONFIG } from "@/lib/competitionConfig";
import type { Competition } from "./competitionTypes";
import CompetitionFields, { type Draft } from "./CompetitionFields";

export const EMPTY: Draft = { name: "", startsAt: "", ...DEFAULT_CONFIG };

function draftOf(competition: Competition): Draft {
  const { id, startedAt, ...rest } = competition;
  void id;
  void startedAt;
  return rest;
}

export default function CompetitionPanel({
  competitionId,
  banks,
  onSaved,
  onChanged,
  onDeleted,
}: {
  competitionId: string | null;
  banks: { id: string; name: string }[];
  onSaved: (id: string) => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<"start" | "reset" | "delete" | null>(null);

  const locked = startedAt !== null;
  const path = `/api/admin/quiz/competitions/${competitionId}`;

  useEffect(() => {
    if (!competitionId) return;
    let alive = true;
    api
      .get<{ competition: Competition }>(`/api/admin/quiz/competitions/${competitionId}`)
      .then((data) => {
        if (!alive) return;
        setDraft(draftOf(data.competition));
        setStartedAt(data.competition.startedAt);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [competitionId]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setNotice("");
  }

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = competitionId
        ? await api.put<{ competition: Competition }>(path, draft)
        : await api.post<{ competition: Competition }>("/api/admin/quiz/competitions", draft);
      setNotice("تم الحفظ");
      onSaved(data.competition.id);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api.post<{ competition: Competition }>(`${path}/copy`, {});
      onSaved(data.competition.id);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function act(what: "start" | "reset" | "delete") {
    setBusy(true);
    setError("");
    try {
      if (what === "start") {
        const data = await api.post<{ competition: Competition }>(`${path}/start`, {});
        setStartedAt(data.competition.startedAt);
      } else if (what === "reset") {
        await api.post(`${path}/reset`, {});
        setNotice("تم تصفير النقاط");
      } else {
        await api.del(path);
        onDeleted();
      }
      onChanged();
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
        <IconLabel name="gear">{competitionId ? "إعدادات المسابقة" : "مسابقة جديدة"}</IconLabel>
      </p>

      {locked && (
        <p
          className="text-xs font-semibold rounded-lg p-2"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          المسابقة انطلقت، الإعدادات مغلقة
        </p>
      )}

      <CompetitionFields draft={draft} banks={banks} locked={locked} onChange={set} />

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
          {competitionId && (
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

      {competitionId && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={copy}
            disabled={busy}
            className="btn btn-sm text-xs"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <IconLabel name="copy">نسخ لمسابقة جديدة</IconLabel>
          </button>
          <button
            onClick={() => setConfirming("delete")}
            disabled={busy}
            className="btn btn-sm text-xs"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            حذف المسابقة
          </button>
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
      {confirming === "delete" && (
        <ConfirmAction
          title="حذف المسابقة"
          message={
            locked
              ? "المسابقة انطلقت، وحذفها يمحو جولاتها ومحاولات المشاركين ونقاطهم نهائياً."
              : "سيتم حذف المسابقة وجولاتها وأسئلتها المحملة."
          }
          confirmLabel="حذف"
          danger
          loading={busy}
          onConfirm={() => act("delete")}
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
