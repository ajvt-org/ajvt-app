"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ProofUpload from "@/components/ProofUpload";
import { api, errorMessage } from "@/lib/api";
import { memberProof as texts } from "@/lib/texts";

export default function MemberProofPanel({
  memberId,
  proof,
  onSaved,
  onClose,
}: {
  memberId: string;
  proof: string | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!picked) return;
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/admin/members/${memberId}/payment`, { paymentProof: picked });
      onClose();
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-2">
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
          className="btn btn-primary btn-sm flex-1"
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
          onClick={onClose}
          className="btn btn-sm"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="close">{texts.cancel}</IconLabel>
        </button>
      </div>
    </div>
  );
}
