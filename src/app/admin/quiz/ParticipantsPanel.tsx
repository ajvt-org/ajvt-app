"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";

interface Candidate {
  userId: string;
  fullName: string;
}

interface Body {
  userIds: string[];
  candidates: Candidate[];
}

export default function ParticipantsPanel({
  competitionId,
  locked,
}: {
  competitionId: string;
  locked: boolean;
}) {
  const [body, setBody] = useState<Body | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<Body>(`/api/admin/quiz/competitions/${competitionId}/participants`)
      .then((data) => {
        if (!alive) return;
        setBody(data);
        setChosen(new Set(data.userIds));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [competitionId]);

  function toggle(userId: string) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    setNotice("");
  }

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { saved } = await api.put<{ saved: number }>(
        `/api/admin/quiz/competitions/${competitionId}/participants`,
        { userIds: [...chosen] },
      );
      setNotice(`تم حفظ ${saved} مشاركاً`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!body) return null;

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="users">المشاركون</IconLabel>
      </p>

      {body.candidates.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لا يوجد منتسب مؤهل للمسابقة
        </p>
      )}

      <div className="max-h-64 overflow-y-auto space-y-1">
        {body.candidates.map((candidate) => (
          <label key={candidate.userId} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={chosen.has(candidate.userId)}
              disabled={locked}
              onChange={() => toggle(candidate.userId)}
            />
            <span style={{ color: "var(--text-main)" }}>{candidate.fullName}</span>
          </label>
        ))}
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

      {!locked && (
        <button onClick={save} disabled={busy} className="btn btn-primary btn-sm text-xs">
          <IconLabel name="save">حفظ المشاركين</IconLabel>
        </button>
      )}
    </div>
  );
}
