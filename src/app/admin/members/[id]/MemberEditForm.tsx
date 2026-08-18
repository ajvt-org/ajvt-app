"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { api, errorMessage } from "@/lib/api";
import { MEMBERSHIP_FEE, PAYMENT_METHODS, validatePaidAmount } from "@/lib/donations";
import { uploadFile } from "@/lib/upload";

// Correcting what a member wrote on their own form: the wrong age group above
// all, which is what most of them get wrong, and the payment method, which no
// screen could change at all before this.
//
// The age group is a list rather than a text box, so an edit cannot invent a
// group that does not exist. A member whose group was deleted keeps it as an
// extra option, or saving anything else would silently move them.
type Member = {
  id: string;
  fullName: string;
  age: string;
  paymentMethod: string | null;
  paidAmount: number | null;
  supportAmount: number;
  photo: string | null;
};

export default function MemberEditForm({
  member,
  onSaved,
  onCancel,
}: {
  member: Member;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState(member.fullName);
  const [age, setAge] = useState(member.age);
  const [paymentMethod, setPaymentMethod] = useState(member.paymentMethod ?? "");
  const [paidAmount, setPaidAmount] = useState(
    member.paidAmount === null ? "" : String(member.paidAmount + member.supportAmount),
  );
  const [photo, setPhoto] = useState(member.photo);
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ ageGroups: { name: string }[] }>("/api/admin/age-groups")
      .then((d) => setAgeGroups((d.ageGroups ?? []).map((g) => g.name)))
      .catch(() => {});
  }, []);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setPhoto(await uploadFile(file));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError("");
    if (!fullName.trim()) {
      setError("الاسم الكامل مطلوب");
      return;
    }
    const amountError = paidAmount.trim() ? validatePaidAmount(paidAmount) : null;
    if (amountError) {
      setError(amountError);
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/api/admin/members/${member.id}`, {
        fullName: fullName.trim(),
        age,
        ...(paymentMethod ? { paymentMethod } : {}),
        photo,
        paidAmount: paidAmount.trim() ? Number(paidAmount) : null,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const groups = ageGroups.includes(age) || !age ? ageGroups : [age, ...ageGroups];
  const methods =
    !paymentMethod || PAYMENT_METHODS.includes(paymentMethod)
      ? PAYMENT_METHODS
      : [paymentMethod, ...PAYMENT_METHODS];

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <label className="cursor-pointer shrink-0">
          <span
            className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: "var(--mint-100)" }}
          >
            {photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`/api/files/${photo}`}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon name="user" size={24} />
            )}
          </span>
          <input type="file" accept="image/*" onChange={pickPhoto} style={{ display: "none" }} />
        </label>
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-bold mb-1" htmlFor="edit-name">
            الاسم الكامل
          </label>
          <input
            id="edit-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={30}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold mb-1" htmlFor="edit-age">
          العصر
        </label>
        <select
          id="edit-age"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="input"
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold mb-1" htmlFor="edit-method">
          طريقة الدفع
        </label>
        <select
          id="edit-method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="input"
        >
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold mb-1" htmlFor="edit-amount">
          المبلغ المسدد (أوقية)
        </label>
        <input
          id="edit-amount"
          type="number"
          inputMode="numeric"
          min={MEMBERSHIP_FEE}
          value={paidAmount}
          onChange={(e) => setPaidAmount(e.target.value)}
          placeholder={String(MEMBERSHIP_FEE)}
          className="input"
          dir="ltr"
        />
      </div>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || uploading}
          className="btn btn-primary text-sm flex-1"
        >
          {uploading ? "جاري الرفع..." : saving ? "جاري الحفظ..." : "حفظ"}
        </button>
        <button
          onClick={onCancel}
          className="btn text-sm"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="close">إلغاء</IconLabel>
        </button>
      </div>
    </div>
  );
}
