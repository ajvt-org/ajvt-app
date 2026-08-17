"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { validatePhone } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/donations";
import DialogHeader from "@/components/DialogHeader";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import Sheet from "@/components/Sheet";
import ActivitySelect from "./ActivitySelect";
import type { ActivityOption, DonationResponse, Proof } from "./paymentTypes";

const EMPTY = {
  donorName: "",
  donorPhone: "",
  amount: "",
  donorPhoto: "",
  paymentMethod: "",
  activityId: "",
  proof: "",
};

function toProof(d: DonationResponse["donation"], activities: ActivityOption[]): Proof {
  return {
    id: d.id,
    kind: "DONATION",
    proof: d.proof,
    memberName: d.donorName || "فاعل خير",
    activityId: d.activityId,
    activityTitle: activities.find((a) => a.id === d.activityId)?.title ?? null,
    amount: d.amount,
    status: d.status,
    source: d.source,
    paymentMethod: d.paymentMethod,
    memberId: d.memberId,
    donorName: d.donorName,
    donorPhone: d.donorPhone,
    donorPhoto: d.donorPhoto,
    uploadedAt: d.updatedAt,
    submittedAt: d.createdAt,
  };
}

function validate(form: typeof EMPTY): string {
  if (!form.donorName.trim()) return "الاسم مطلوب";
  if (form.donorPhone.trim()) {
    const phoneError = validatePhone(form.donorPhone);
    if (phoneError) return phoneError;
  }
  const amount = Number(form.amount);
  if (!Number.isInteger(amount) || amount <= 0) return "المبلغ يجب أن يكون رقماً صحيحاً موجباً";
  return "";
}

export default function ManualDonationDialog({
  activities,
  onClose,
  onCreated,
}: {
  activities: ActivityOption[];
  onClose: () => void;
  onCreated: (proof: Proof) => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (changes: Partial<typeof EMPTY>) => setForm((p) => ({ ...p, ...changes }));

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const invalid = validate(form);
    setError(invalid);
    if (invalid) return;

    setSaving(true);
    try {
      const { donation } = await api.post<DonationResponse>("/api/admin/donations", {
        donorName: form.donorName.trim(),
        donorPhone: form.donorPhone.trim() || null,
        donorPhoto: form.donorPhoto || null,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod || null,
        activityId: form.activityId || null,
        proof: form.proof || null,
      });
      onCreated(toProof(donation, activities));
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <DialogHeader
        title={<IconLabel name="plus">تسجيل تبرع يدوياً</IconLabel>}
        onClose={onClose}
      />

      <form onSubmit={submit} className="p-5 space-y-3">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لتبرع تلقيته خارج التطبيق نقداً أو تحويلاً — يُحتسب مباشرة في لوحة شرف المتبرعين.
        </p>

        <PhotoUpload
          photo={form.donorPhoto || null}
          imageUrlPrefix="/api/files/donation"
          variant="avatar"
          label="صورة المتبرع (اختياري)"
          placeholderIcon="👤"
          onUpload={(filename) => set({ donorPhoto: filename })}
        />
        <PhotoUpload
          photo={form.proof || null}
          variant="cover"
          label="إثبات الدفع (اختياري — يمكن إضافته لاحقاً)"
          placeholderIcon="🧾"
          onUpload={(filename) => set({ proof: filename })}
        />

        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="manual-donor-name"
          >
            اسم المتبرع <span style={{ color: "var(--copper-500)" }}>*</span>
          </label>
          <input
            id="manual-donor-name"
            type="text"
            value={form.donorName}
            onChange={(e) => set({ donorName: e.target.value })}
            maxLength={50}
            required
            className="input"
          />
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="manual-donor-phone"
          >
            رقم الهاتف (اختياري)
          </label>
          <input
            id="manual-donor-phone"
            type="tel"
            dir="ltr"
            value={form.donorPhone}
            onChange={(e) => set({ donorPhone: e.target.value.replace(/\D/g, "").slice(0, 8) })}
            placeholder="2XXXXXXX"
            maxLength={8}
            className="input"
          />
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="manual-amount"
          >
            المبلغ (MRU) <span style={{ color: "var(--copper-500)" }}>*</span>
          </label>
          <input
            id="manual-amount"
            type="number"
            dir="ltr"
            min={1}
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
            required
            className="input"
          />
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="manual-payment-method"
          >
            طريقة الدفع
          </label>
          <select
            id="manual-payment-method"
            value={form.paymentMethod}
            onChange={(e) => set({ paymentMethod: e.target.value })}
            className="input"
          >
            <option value="">غير محددة</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="manual-activity"
          >
            وجهة الدعم
          </label>
          <ActivitySelect
            id="manual-activity"
            activities={activities}
            value={form.activityId}
            onChange={(activityId) => set({ activityId })}
            className="input"
          />
        </div>

        {error && (
          <div
            className="p-3 rounded-xl text-sm font-semibold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            <Icon name="warning" size={13} className="icon-inline" /> {error}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn btn-primary text-sm">
          {saving ? "..." : "تسجيل التبرع"}
        </button>
      </form>
    </Sheet>
  );
}
