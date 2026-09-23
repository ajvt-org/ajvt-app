"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";
import IconLabel from "@/components/IconLabel";
import { electionState, endsAt, type ElectionWindow } from "@/lib/election";
import { toLocalInput, fromLocalInput } from "@/lib/localDateInput";
import { confirmDialog, electionAdmin as texts } from "@/lib/texts";
import { Field } from "./ElectionFieldParts";

const HOUR = 3_600_000;

function firstOffer(election: ElectionWindow): string {
  return new Date(Math.max(endsAt(election).getTime(), Date.now()) + HOUR).toISOString();
}

export default function ExtendClose({
  electionId,
  election,
  resultShown,
  onMoved,
}: {
  electionId: string;
  election: ElectionWindow;
  resultShown: boolean;
  onMoved: (closesAt: string) => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reopening = electionState(election) === "ended";

  async function save() {
    if (!value) return;
    setBusy(true);
    setError("");
    try {
      await api.put(`/api/admin/elections/${electionId}/close`, { closesAt: value });
      onMoved(value);
      setValue(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      setAsking(false);
    }
  }

  if (value === null) {
    return (
      <button onClick={() => setValue(firstOffer(election))} className="btn btn-sm">
        <IconLabel name="clock">{reopening ? texts.reopen : texts.extend}</IconLabel>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Field label={texts.newClose} id="e-close">
        <input
          id="e-close"
          type="datetime-local"
          value={toLocalInput(value)}
          min={toLocalInput(endsAt(election).toISOString())}
          onChange={(e) => setValue(fromLocalInput(e.target.value))}
          className="input input-sm"
        />
      </Field>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => (reopening && resultShown ? setAsking(true) : save())}
          disabled={busy || !value}
          className="btn btn-primary btn-sm"
        >
          {texts.confirmClose}
        </button>
        <button onClick={() => setValue(null)} disabled={busy} className="btn btn-sm">
          {confirmDialog.cancel}
        </button>
      </div>
      {asking && (
        <ConfirmDialog
          title={texts.reopen}
          message={texts.reopenBody}
          loading={busy}
          onConfirm={save}
          onClose={() => setAsking(false)}
        />
      )}
    </div>
  );
}
