"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Money from "@/components/Money";
import ConfirmDialog from "@/components/ConfirmDialog";
import { financeTags as texts } from "@/lib/texts";

export type FinanceTagRow = { id: string; name: string; count: number; total: number };

export default function FinanceTagManager({
  tags,
  onChanged,
  onClose,
}: {
  tags: FinanceTagRow[];
  onChanged: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState<FinanceTagRow | null>(null);

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
      await api.post("/api/admin/finance-tags", { name: name.trim() });
      setName("");
    });
  }

  async function rename(id: string) {
    if (!editingName.trim()) return;
    await run(async () => {
      await api.patch(`/api/admin/finance-tags/${id}`, { name: editingName.trim() });
      setEditingId(null);
    });
  }

  async function remove(tag: FinanceTagRow) {
    setAsking(null);
    await run(() => api.del(`/api/admin/finance-tags/${tag.id}`));
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-black text-sm" style={{ color: "var(--text-main)" }}>
          <IconLabel name="tag">{texts.title}</IconLabel>
        </p>
        <button type="button" onClick={onClose} className="btn-icon" aria-label={texts.close}>
          <Icon name="close" size={16} />
        </button>
      </div>

      <form onSubmit={create} className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder={texts.newTagPlaceholder}
          className="input flex-1 min-w-0"
          aria-label={texts.newTagLabel}
        />
        <button type="submit" disabled={busy || !name.trim()} className="btn btn-sm btn-ghost">
          <IconLabel name="plus">{texts.add}</IconLabel>
        </button>
      </form>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}

      {tags.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
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
                    aria-label={texts.renameLabel}
                  />
                  <button
                    type="button"
                    onClick={() => rename(tag.id)}
                    disabled={busy}
                    className="btn btn-sm btn-ghost"
                  >
                    <IconLabel name="check">{texts.save}</IconLabel>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="btn btn-sm btn-ghost"
                  >
                    {texts.cancel}
                  </button>
                </>
              ) : (
                <>
                  <span className="font-bold text-sm flex-1 min-w-0 truncate">{tag.name}</span>
                  <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                    {tag.count} · <Money value={tag.total} />
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(tag.id);
                      setEditingName(tag.name);
                    }}
                    className="btn-icon"
                    aria-label={texts.editOf(tag.name)}
                  >
                    <Icon name="pencil" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsking(tag)}
                    disabled={busy}
                    className="btn-icon"
                    aria-label={texts.deleteOf(tag.name)}
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

      {asking && (
        <ConfirmDialog
          title={texts.confirmDeleteTitle}
          message={asking.count > 0 ? texts.confirmDeleteInUse(asking.count) : texts.confirmDelete}
          confirmLabel={texts.delete}
          danger
          loading={busy}
          onConfirm={() => remove(asking)}
          onClose={() => setAsking(null)}
        />
      )}
    </div>
  );
}
