"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { defaultSettings, type AppSettingsValues } from "@/lib/settings";
import PageLoading from "@/components/PageLoading";
import SettingsFieldInput from "./SettingsFieldInput";
import SettingsSwitch from "./SettingsSwitch";
import { groupedFields } from "./settingsFields";
import { settingsPage } from "@/lib/texts";

export default function SettingsForm() {
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
    <form onSubmit={save} className="card p-5 space-y-5">
      {groupedFields().map((group, at) => (
        <div
          key={group.key}
          className="space-y-4"
          style={
            at === 0 ? undefined : { borderTop: "1px solid var(--mint-100)", paddingTop: "1.25rem" }
          }
        >
          <p className="text-sm font-black" style={{ color: "var(--mint-700)" }}>
            {group.title}
          </p>
          {group.fields.map((field) =>
            field.kind === "switch" ? (
              <SettingsSwitch
                key={field.key}
                field={field}
                value={values[field.key] === true}
                onChange={(value) => setValues((p) => ({ ...p, [field.key]: value }))}
              />
            ) : (
              <SettingsFieldInput
                key={field.key}
                field={field}
                value={values[field.key] as string | number | null}
                onChange={(value) => setValues((p) => ({ ...p, [field.key]: value }))}
              />
            ),
          )}
        </div>
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
  );
}
