"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import { electionCandidates as texts } from "@/lib/texts";
import CandidateCard from "./CandidateCard";
import type { ElectionCandidateRow } from "./electionTypes";

interface Draft {
  id: string | null;
  fullName: string;
  photo: string | null;
}

const BLANK: Draft = { id: null, fullName: "", photo: null };

export default function CandidatesPanel({
  electionId,
  candidates,
  frozen,
  onChanged,
}: {
  electionId: string;
  candidates: ElectionCandidateRow[];
  frozen: boolean;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<ElectionCandidateRow | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const path = `/api/admin/elections/${electionId}/candidates`;

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const body = { fullName: draft.fullName, photo: draft.photo };
      if (draft.id) await api.patch(`${path}/${draft.id}`, body);
      else await api.post(path, body);
      setDraft(null);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    setError("");
    try {
      await api.del(`${path}/${removing.id}`);
      setRemoving(null);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          {texts.heading}
        </p>
        <button
          onClick={() => setDraft(BLANK)}
          disabled={frozen || busy}
          className="btn btn-primary btn-sm disabled:opacity-40"
        >
          <IconLabel name="plus">{texts.add}</IconLabel>
        </button>
      </div>

      {candidates.length === 0 && !draft && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </p>
      )}

      {draft && (
        <div className="card p-3 space-y-3" style={{ border: "1px solid var(--mint-300)" }}>
          <div className="min-w-0">
            <label
              htmlFor="candidate-name"
              className="block text-xs font-bold mb-1"
              style={{ color: "var(--text-main)" }}
            >
              {texts.fullName}
            </label>
            <input
              id="candidate-name"
              type="text"
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              className="input input-sm"
            />
          </div>

          <PhotoUpload
            photo={draft.photo}
            label={texts.photo}
            variant="tile"
            imageUrlPrefix="/api/files/candidate"
            onUpload={(filename) => setDraft({ ...draft, photo: filename })}
          />

          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn btn-primary btn-sm">
              <IconLabel name="save">{texts.save}</IconLabel>
            </button>
            <button
              onClick={() => setDraft(null)}
              disabled={busy}
              className="btn btn-sm"
              style={{ background: "var(--surface-2)", color: "var(--text-main)" }}
            >
              {texts.cancel}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}

      <div className="space-y-2">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            frozen={frozen}
            busy={busy}
            onEdit={() =>
              setDraft({
                id: candidate.id,
                fullName: candidate.fullName,
                photo: candidate.photo,
              })
            }
            onRemove={() => setRemoving(candidate)}
          />
        ))}
      </div>

      {removing && (
        <ConfirmDialog
          title={texts.confirmRemove}
          message={texts.confirmRemoveBody(removing.fullName)}
          danger
          loading={busy}
          onConfirm={remove}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
