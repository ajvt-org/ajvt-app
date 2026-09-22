"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";
import IconLabel from "@/components/IconLabel";
import { electionState } from "@/lib/election";
import { electionAdmin as texts } from "@/lib/texts";
import ElectionFields from "./ElectionFields";
import { EMPTY_ELECTION, draftOf, type ElectionDraft, type ElectionRow } from "./electionTypes";

export default function ElectionPanel({
  election,
  onSaved,
  onChanged,
  onDeleted,
}: {
  election: ElectionRow | null;
  onSaved: (id: string) => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState<ElectionDraft>(election ? draftOf(election) : EMPTY_ELECTION);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const frozen = election !== null && electionState(election) !== "upcoming";
  const removable = election !== null && election.hidden && election._count.ballots === 0;

  function set<K extends keyof ElectionDraft>(key: K, value: ElectionDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = frozen ? { showResults: draft.showResults } : draft;
      const data = election
        ? await api.patch<{ election: ElectionRow }>(`/api/admin/elections/${election.id}`, body)
        : await api.post<{ election: ElectionRow }>("/api/admin/elections", draft);
      setDraft(draftOf(data.election));
      setNotice(texts.saved);
      onSaved(data.election.id);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!election) return;
    setBusy(true);
    setError("");
    try {
      await api.del(`/api/admin/elections/${election.id}`);
      onDeleted();
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      {!election && (
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="ballot">{texts.newElection}</IconLabel>
        </p>
      )}

      {frozen && (
        <p
          className="text-xs font-semibold rounded-lg p-2"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {texts.frozen}
        </p>
      )}

      <ElectionFields draft={draft} frozen={frozen} onChange={set} />

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

      <div className="flex gap-2 flex-wrap">
        <button onClick={save} disabled={busy} className="btn btn-primary btn-sm">
          <IconLabel name="save">{texts.save}</IconLabel>
        </button>

        {removable && (
          <button
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="btn btn-sm"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            {texts.remove}
          </button>
        )}
      </div>

      {confirming && election && (
        <ConfirmDialog
          title={texts.confirmRemove}
          message={texts.confirmRemoveBody(election.title)}
          danger
          loading={busy}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
