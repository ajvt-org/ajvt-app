"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { api, errorMessage } from "@/lib/api";

export default function InlineName({
  memberId,
  fullName,
  onRenamed,
}: {
  memberId: string;
  fullName: string;
  onRenamed: (fullName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fullName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function stop(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  function open(e: React.MouseEvent) {
    stop(e);
    setValue(fullName);
    setError("");
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError("");
    setValue(fullName);
  }

  async function save() {
    const name = value.trim();
    if (!name || name === fullName) {
      cancel();
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/admin/members/${memberId}`, { fullName: name });
      onRenamed(name);
      setEditing(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <p className="font-bold truncate" style={{ color: "var(--text-main)" }}>
          {fullName}
        </p>
        <button
          onClick={open}
          aria-label={`تعديل اسم ${fullName}`}
          className="shrink-0 p-1 rounded-lg"
          style={{ color: "var(--mint-700)" }}
        >
          <Icon name="pencil" size={14} />
        </button>
      </div>
    );
  }

  return (
    <div onClick={stop}>
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          maxLength={30}
          disabled={saving}
          aria-label="الاسم"
          className="input text-sm"
          autoFocus
        />
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0 disabled:opacity-40"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {saving ? "..." : "حفظ"}
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          aria-label="إلغاء"
          className="text-xs px-2 py-1.5 rounded-lg font-bold shrink-0 disabled:opacity-40"
          style={{ background: "white", color: "var(--text-muted)" }}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      {error && (
        <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
