"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export type ExpenseTagRow = { id: string; name: string; count: number; total: number };

// Where the tags themselves are kept. Each row carries what has been spent
// under it, which is the question the tags were added to answer; deleting one
// leaves the expenses alone, so the totals move but no record is lost.
export default function ExpenseTagManager({
  tags,
  onChanged,
  onClose,
}: {
  tags: ExpenseTagRow[];
  onChanged: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function create(ev: React.SubmitEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!name.trim()) return;
    await run(async () => {
      await api.post("/api/admin/expense-tags", { name: name.trim() });
      setName("");
    });
  }

  async function rename(id: string) {
    if (!editingName.trim()) return;
    await run(async () => {
      await api.patch(`/api/admin/expense-tags/${id}`, { name: editingName.trim() });
      setEditingId(null);
    });
  }

  async function remove(tag: ExpenseTagRow) {
    const warning =
      tag.count > 0
        ? `سيُزال هذا التصنيف من ${tag.count} مصروف. المصاريف نفسها تبقى. متابعة؟`
        : "حذف هذا التصنيف؟";
    if (!confirm(warning)) return;
    await run(() => api.del(`/api/admin/expense-tags/${tag.id}`));
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-black text-sm" style={{ color: "var(--text-main)" }}>
          <IconLabel name="tag">تصنيفات المصاريف</IconLabel>
        </p>
        <button type="button" onClick={onClose} className="btn-icon" aria-label="إغلاق">
          <Icon name="close" size={16} />
        </button>
      </div>

      <form onSubmit={create} className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="تصنيف جديد"
          className="input flex-1 min-w-0"
          aria-label="اسم التصنيف الجديد"
        />
        <button type="submit" disabled={busy || !name.trim()} className="btn btn-sm btn-ghost">
          <IconLabel name="plus">إضافة</IconLabel>
        </button>
      </form>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}

      {tags.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لا توجد تصنيفات بعد
        </p>
      ) : (
        <ul className="space-y-1.5">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-2 py-1.5"
              style={{ borderTop: "1px solid var(--mint-100)" }}
            >
              {editingId === tag.id ? (
                <>
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    maxLength={30}
                    className="input flex-1 min-w-0"
                    aria-label="الاسم الجديد"
                  />
                  <button
                    type="button"
                    onClick={() => rename(tag.id)}
                    disabled={busy}
                    className="btn btn-sm btn-ghost"
                  >
                    <IconLabel name="check">حفظ</IconLabel>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="btn btn-sm btn-ghost"
                  >
                    إلغاء
                  </button>
                </>
              ) : (
                <>
                  <span className="font-bold text-sm flex-1 min-w-0 truncate">{tag.name}</span>
                  <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                    {tag.count} · {tag.total} أوقية
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(tag.id);
                      setEditingName(tag.name);
                    }}
                    className="btn-icon"
                    aria-label={`تعديل ${tag.name}`}
                  >
                    <Icon name="pencil" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(tag)}
                    disabled={busy}
                    className="btn-icon"
                    aria-label={`حذف ${tag.name}`}
                    style={{ color: "#991b1b" }}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
