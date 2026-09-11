"use client";

import { useState } from "react";
import AdminToolHeader from "@/components/admin/AdminToolHeader";
import Notice from "@/components/Notice";
import UploadZone from "@/app/admin/dashboard/UploadZone";
import { errorMessage } from "@/lib/api";
import { adminTools, proofCheck as texts } from "@/lib/texts";
import ProofCheckResult, { type CheckedRow } from "./ProofCheckResult";

export default function ProofCheckPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [rows, setRows] = useState<CheckedRow[] | null>(null);
  const [error, setError] = useState("");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setRows(null);
    setError("");
    setChecking(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/proof-check", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "");
      setRows(data.reuse as CheckedRow[]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="admin-page space-y-3">
      <AdminToolHeader href="/admin/payments/proof-check" note={texts.nothingSaved} />

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.intro}
      </p>

      <UploadZone
        label={adminTools.proofCheck}
        prompt={texts.prompt}
        preview={preview}
        alt={texts.prompt}
        uploading={checking}
        busyLabel={texts.checking}
        onPick={pick}
      />

      {error && <Notice tone="error">{error}</Notice>}

      {!checking && rows !== null && <ProofCheckResult rows={rows} />}
    </div>
  );
}
