"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { PAYMENT_METHODS } from "@/lib/donations";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import type { DonationResponse, Proof } from "./paymentTypes";

const WHITE = { background: "white" };

function initial(proof: Proof) {
  return {
    donorName: proof.donorName || "",
    donorPhone: proof.donorPhone || "",
    donorPhoto: proof.donorPhoto || null,
    amount: proof.amount != null ? String(proof.amount) : "",
    paymentMethod: proof.paymentMethod || "",
    proof: proof.proof || null,
  };
}

export default function DonationEditForm({
  proof,
  onCancel,
  onSaved,
}: {
  proof: Proof;
  onCancel: () => void;
  onSaved: (changes: Partial<Proof>) => void;
}) {
  const [form, setForm] = useState(initial(proof));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const linked = !!proof.memberId;

  const set = (changes: Partial<typeof form>) => setForm((p) => ({ ...p, ...changes }));

  async function save() {
    setError("");
    if (!linked && !form.donorName.trim()) return setError("الاسم مطلوب");

    const amount = form.amount.trim() ? Number(form.amount) : null;
    if (amount !== null && (!Number.isInteger(amount) || amount <= 0)) {
      return setError("المبلغ يجب أن يكون رقماً صحيحاً موجباً");
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        donorPhone: form.donorPhone.trim() || null,
        paymentMethod: form.paymentMethod || null,
        proof: form.proof,
      };
      if (!linked) {
        body.donorName = form.donorName.trim();
        body.donorPhoto = form.donorPhoto;
      }
      if (amount !== null) body.amount = amount;

      const { donation } = await api.patch<DonationResponse>(
        `/api/admin/donations/${proof.id}`,
        body,
      );
      onSaved({
        donorName: donation.donorName,
        donorPhone: donation.donorPhone,
        donorPhoto: donation.donorPhoto,
        amount: donation.amount,
        paymentMethod: donation.paymentMethod,
        proof: donation.proof,
        memberName: linked ? proof.memberName : donation.donorName || "فاعل خير",
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="mt-2 p-2.5 rounded-lg space-y-2"
      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
    >
      <PhotoUpload
        photo={form.proof}
        variant="cover"
        label="إثبات الدفع"
        placeholderIcon="🧾"
        onUpload={(filename) => set({ proof: filename })}
      />

      {!linked && (
        <>
          <PhotoUpload
            photo={form.donorPhoto}
            imageUrlPrefix="/api/files/donation"
            variant="avatar"
            label="صورة المتبرع"
            placeholderIcon="👤"
            onUpload={(filename) => set({ donorPhoto: filename })}
          />
          <input
            type="text"
            placeholder="اسم المتبرع"
            value={form.donorName}
            onChange={(e) => set({ donorName: e.target.value })}
            maxLength={50}
            className="input text-xs"
            style={WHITE}
          />
        </>
      )}

      <input
        type="tel"
        dir="ltr"
        placeholder="رقم الهاتف (اختياري)"
        value={form.donorPhone}
        onChange={(e) => set({ donorPhone: e.target.value.replace(/\D/g, "").slice(0, 8) })}
        maxLength={8}
        className="input text-xs"
        style={WHITE}
      />
      <input
        type="number"
        dir="ltr"
        placeholder="المبلغ"
        value={form.amount}
        onChange={(e) => set({ amount: e.target.value })}
        className="input text-xs"
        style={WHITE}
      />
      <select
        value={form.paymentMethod}
        onChange={(e) => set({ paymentMethod: e.target.value })}
        className="input text-xs"
        style={WHITE}
      >
        <option value="">طريقة الدفع — غير محددة</option>
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      {error && (
        <div
          className="p-2 rounded-lg text-xs font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {saving ? "..." : <IconLabel name="save">حفظ</IconLabel>}
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "white", color: "var(--text-muted)" }}
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}
