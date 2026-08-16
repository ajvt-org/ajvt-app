"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { DEFAULT_SETTINGS, type AppSettingsValues } from "@/lib/settings";
import { arabicValidity } from "@/lib/validationMessage";

export default function AdminSettingsPage() {
  const [values, setValues] = useState<AppSettingsValues>(DEFAULT_SETTINGS);
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
        membershipFee: Number(values.membershipFee),
        supportWhatsapp: values.supportWhatsapp,
        tempPasswordHours: Number(values.tempPasswordHours),
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

  if (loading) {
    return (
      <div className="admin-page">
        <div className="text-center py-16" style={{ color: "var(--mint-500)" }}>
          <p className="text-sm font-semibold">جارٍ التحميل</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page space-y-5">
      <h1 className="text-lg font-black" style={{ color: "var(--text-main)" }}>
        إعدادات الرابطة
      </h1>

      <form onSubmit={save} className="card p-5 space-y-4">
        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="settings-field-1"
          >
            رسم العضوية (أوقية)
          </label>
          <input
            id="settings-field-1"
            type="number"
            min={1}
            step={1}
            value={values.membershipFee}
            onChange={(e) =>
              setValues((p) => ({ ...p, membershipFee: Number(e.target.value) || 0 }))
            }
            required
            {...arabicValidity()}
            className="input"
            dir="ltr"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            المبلغ الأدنى المقبول في استمارة الانضمام.
          </p>
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="settings-field-2"
          >
            صلاحية كلمة المرور المؤقتة (ساعة)
          </label>
          <input
            id="settings-field-2"
            type="number"
            min={1}
            max={720}
            step={1}
            value={values.tempPasswordHours}
            onChange={(e) =>
              setValues((p) => ({ ...p, tempPasswordHours: Number(e.target.value) || 0 }))
            }
            required
            {...arabicValidity()}
            className="input"
            dir="ltr"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            بعد هذه المدة تتوقف كلمة المرور المؤقتة عن العمل ويحتاج العضو إلى واحدة جديدة.
          </p>
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="settings-field-3"
          >
            رقم واتساب الدعم
          </label>
          <input
            id="settings-field-3"
            type="tel"
            inputMode="numeric"
            value={values.supportWhatsapp}
            onChange={(e) =>
              setValues((p) => ({ ...p, supportWhatsapp: e.target.value.replace(/\D/g, "") }))
            }
            required
            {...arabicValidity()}
            className="input"
            dir="ltr"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            يُستعمل في صفحة استعادة كلمة المرور، مع رمز الدولة ودون علامة +.
          </p>
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="settings-field-4"
          >
            رابط مجموعة الواتساب
          </label>
          <input
            id="settings-field-4"
            type="url"
            value={values.whatsappGroup ?? ""}
            onChange={(e) => setValues((p) => ({ ...p, whatsappGroup: e.target.value }))}
            placeholder="https://chat.whatsapp.com/..."
            className="input"
            dir="ltr"
          />
        </div>

        {error && (
          <p className="text-sm font-bold" style={{ color: "#991b1b" }}>
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>
            تم الحفظ
          </p>
        )}

        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
      </form>
    </div>
  );
}
