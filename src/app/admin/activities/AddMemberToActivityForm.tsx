"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import { STATUS_LABEL, type MemberOption } from "./activityTypes";

export default function AddMemberToActivityForm({
  activityId,
  candidates,
  actionLoading,
  onRegister,
}: {
  activityId: string;
  candidates: MemberOption[];
  actionLoading: boolean;
  onRegister: (activityId: string, memberId: string) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");

  const filtered = candidates.filter((m) => {
    const q = search.trim();
    return !q || m.fullName.includes(q) || (m.phone || "").includes(q);
  });

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="plus">تسجيل عضو يدوياً</IconLabel>
      </p>
      <input
        type="text"
        placeholder="بحث بالاسم أو الهاتف..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input text-sm"
      />
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input flex-1 text-sm"
        >
          <option value="">اختر عضواً...</option>
          {filtered.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName} — {STATUS_LABEL[m.status]}
            </option>
          ))}
        </select>
        <button
          onClick={async () => {
            const ok = await onRegister(activityId, selected);
            if (ok) setSelected("");
          }}
          disabled={!selected || actionLoading}
          className="btn btn-primary text-xs px-3"
          style={{ width: "auto" }}
        >
          تسجيل
        </button>
      </div>
    </div>
  );
}
