"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

export default function ActivityWhatsappLinkEditor({
  activityId,
  link,
  saving,
  onSave,
}: {
  activityId: string;
  link: string | null;
  saving: boolean;
  onSave: (activityId: string, link: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(link || "");

  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(link || "");
          setEditing(true);
        }}
        className="text-xs font-bold"
        style={{ color: "var(--mint-600)" }}
      >
        <Icon name="chat" size={14} className="icon-inline" /> {link || "إضافة رابط الواتساب"}{" "}
        <Icon name="pencil" size={12} className="icon-inline" />
      </button>
    );
  }

  return (
    <div className="flex gap-1.5">
      <input
        type="text"
        dir="ltr"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="https://chat.whatsapp.com/..."
        className="input text-xs flex-1"
      />
      <button
        onClick={async () => {
          const ok = await onSave(activityId, draft);
          if (ok) setEditing(false);
        }}
        disabled={saving}
        className="text-xs px-2.5 py-1 rounded-lg font-bold shrink-0"
        style={{ background: "var(--mint-600)", color: "white" }}
      >
        حفظ
      </button>
    </div>
  );
}
