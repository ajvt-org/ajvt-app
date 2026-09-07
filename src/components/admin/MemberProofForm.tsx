"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ProofUpload from "@/components/ProofUpload";
import VerbButton from "@/components/admin/VerbButton";
import { SAFE } from "@/components/admin/verbTones";
import { api, errorMessage } from "@/lib/api";
import { memberProof as texts } from "@/lib/texts";

export default function MemberProofForm({
  memberId,
  proof,
  onSaved,
  compact,
  onOpenChange,
}: {
  memberId: string;
  proof: string | null;
  onSaved: () => void;
  compact?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function show(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  function close() {
    show(false);
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
    const label = proof ? texts.replace : texts.add;
    return (
      <VerbButton icon="camera" label={label} tone={SAFE} onClick={() => show(true)}>
        {compact ? undefined : label}
      </VerbButton>
    );
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
          onClick={close}
          className="btn btn-sm"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="close">{texts.cancel}</IconLabel>
        </button>
      </div>
    </div>
  );
}
