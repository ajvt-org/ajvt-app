"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import IconLabel from "@/components/IconLabel";
import { electionState } from "@/lib/election";
import { electionAdmin as texts } from "@/lib/texts";
import CandidatesPanel from "./CandidatesPanel";
import ElectionFields from "./ElectionFields";
import ElectionResult from "@/components/ElectionResult";
import { EMPTY_ELECTION, draftOf, type ElectionDraft, type ElectionRow } from "./electionTypes";

export default function ElectionPanel({
  election,
  electorate,
  onSaved,
  onChanged,
  onDeleted,
}: {
  election: ElectionRow | null;
  electorate: number;
  onSaved: (id: string) => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState<ElectionDraft>(election ? draftOf(election) : EMPTY_ELECTION);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const state = election ? electionState(election) : null;
  const frozen = state !== null && state !== "upcoming";

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

  async function remove(confirmTitle = "") {
    if (!election) return;
    setBusy(true);
    setError("");
    try {
      await api.del(`/api/admin/elections/${election.id}`, { confirmTitle });
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

        {election && (
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

      {election && election._count.ballots > 0 && (
        <ElectionResult
          allowBlank={election.allowBlank}
          result={{
            electorate,
            cast: election._count.ballots,
            blank:
              election._count.ballots -
              election.candidates.reduce((total, one) => total + one._count.ballots, 0),
            rows: election.candidates.map((candidate) => ({
              candidateId: candidate.id,
              fullName: candidate.fullName,
              photo: candidate.photo,
              votes: candidate._count.ballots,
            })),
          }}
        />
      )}

      {election && (
        <CandidatesPanel
          electionId={election.id}
          candidates={election.candidates}
          frozen={frozen}
          onChanged={onChanged}
        />
      )}

      {confirming && election && state === "open" && (
        <ConfirmDeleteDialog
          name={election.title}
          consequence={texts.confirmRemoveBody(election.title)}
          title={texts.confirmRemove}
          nameField={texts.titleField}
          confirmLabel={texts.remove}
          loading={busy}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        />
      )}

      {confirming && election && state !== "open" && (
        <ConfirmDialog
          title={texts.confirmRemove}
          message={texts.confirmRemoveBody(election.title)}
          danger
          loading={busy}
          onConfirm={() => remove()}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
