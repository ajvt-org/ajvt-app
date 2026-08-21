"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Toggle from "./Toggle";
import { push } from "@/lib/messages";

interface CategoryRow {
  key: string;
  label: string;
  optOut: boolean;
  enabled: boolean;
}

export default function NotificationCategories() {
  const [rows, setRows] = useState<CategoryRow[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<{ categories: CategoryRow[] }>("/api/user/notification-preferences")
      .then((data) => {
        if (alive) setRows(data.categories);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function change(category: string, enabled: boolean) {
    setSaving(category);
    setError("");
    setRows((current) => (current ?? []).map((r) => (r.key === category ? { ...r, enabled } : r)));
    try {
      await api.put("/api/user/notification-preferences", { category, enabled });
    } catch {
      setError(push.categorySaveFailed);
      setRows((current) =>
        (current ?? []).map((r) => (r.key === category ? { ...r, enabled: !enabled } : r)),
      );
    } finally {
      setSaving(null);
    }
  }

  if (!rows || rows.length === 0) return null;

  const choosable = rows.filter((r) => r.optOut);
  const always = rows.filter((r) => !r.optOut);

  return (
    <div className="card p-4 mt-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        {push.categoriesHeading}
      </p>
      {error && (
        <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-3">
        {choosable.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3">
            <span className="text-sm" style={{ color: "var(--text-main)" }}>
              {row.label}
            </span>
            <Toggle
              label={row.label}
              checked={row.enabled}
              disabled={saving === row.key}
              onChange={(next) => change(row.key, next)}
            />
          </div>
        ))}
      </div>
      {always.length > 0 && (
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          {push.alwaysOn}: {always.map((r) => r.label).join("، ")}
        </p>
      )}
    </div>
  );
}
