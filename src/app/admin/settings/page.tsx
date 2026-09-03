"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { defaultSettings, type AppSettingsValues } from "@/lib/settings";
import PageLoading from "@/components/PageLoading";
import DataExport from "./DataExport";
import PaymentMethodManager from "@/components/admin/PaymentMethodManager";
import SettingsFieldInput from "./SettingsFieldInput";
import { SETTINGS_FIELDS } from "./settingsFields";
import { settingsPage } from "@/lib/texts";

export default function AdminSettingsPage() {
  const [values, setValues] = useState<AppSettingsValues>(defaultSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get<{ settings: AppSettingsValues }>("/api/admin/settings")
      .then((d) => setValues(d.settings))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const d = await api.patch<{ settings: AppSettingsValues }>("/api/admin/settings", {
        ...values,
        whatsappGroup: values.whatsappGroup ?? "",
      });
      setValues(d.settings);
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="admin-page space-y-5">
      <h1 className="text-lg font-black" style={{ color: "var(--text-main)" }}>
        {settingsPage.title}
      </h1>

      <DataExport />

      <PaymentMethodManager />

      <form onSubmit={save} className="card p-5 space-y-4">
        {SETTINGS_FIELDS.map((field) => (
          <SettingsFieldInput
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(value) => setValues((p) => ({ ...p, [field.key]: value }))}
          />
        ))}

        {error && (
          <p className="text-sm font-bold" style={{ color: "#991b1b" }}>
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>
            {settingsPage.saved}
          </p>
        )}

        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? settingsPage.saving : settingsPage.save}
        </button>
      </form>
    </div>
  );
}
