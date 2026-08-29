"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ProofUpload from "@/components/ProofUpload";
import { api, errorMessage } from "@/lib/api";
import { memberProof as texts } from "@/lib/texts";

export default function MemberProofForm({
  memberId,
  proof,
  onSaved,
}: {
  memberId: string;
  proof: string | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setOpen(false);
    setPicked(null);
    setError("");
  }

  async function save() {
    if (!picked) return;
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/admin/members/${memberId}/payment`, { paymentProof: picked });
      close();
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn btn-sm text-xs font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        <IconLabel name="camera">{proof ? texts.replace : texts.add}</IconLabel>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <ProofUpload existingProof={proof} onUploaded={setPicked} onUploadingChange={setUploading} />
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!picked || uploading || saving}
          className="btn btn-primary btn-sm text-xs flex-1"
        >
          {uploading ? (
            texts.uploading
          ) : saving ? (
            texts.saving
          ) : (
            <IconLabel name="save">{texts.save}</IconLabel>
          )}
        </button>
        <button
          onClick={close}
          className="btn btn-sm text-xs"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="close">{texts.cancel}</IconLabel>
        </button>
      </div>
    </div>
  );
}
