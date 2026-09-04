"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PickList from "@/components/admin/PickList";
import { useAdminVillages } from "@/components/admin/useAdminVillages";
import { api, errorMessage } from "@/lib/api";
import { MEMBERSHIP_FEE, validatePaidAmount } from "@/lib/donations";
import { usePaymentMethods } from "@/components/admin/usePaymentMethods";
import { accountsOfMethod, methodChoiceNames } from "@/lib/paymentMethodChoices";
import PaymentAccountPicker from "@/components/admin/PaymentAccountPicker";
import { paymentAccountPicker } from "@/lib/texts";
import { uploadFile } from "@/lib/upload";
import { memberEdit, memberForm, villageField } from "@/lib/texts";
import { members as memberMessages } from "@/lib/messages";
import { OTHER_VILLAGE, ageForVillage, requiresAgeGroup } from "@/lib/villages";

type Member = {
  id: string;
  fullName: string;
  age: string | null;
  village: string;
  paymentMethod: string | null;
  accountId: string | null;
  account: { id: string; code: string; label: string | null } | null;
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
  const [age, setAge] = useState(member.age ?? "");
  const [village, setVillage] = useState(member.village);
  const [paymentMethod, setPaymentMethod] = useState(member.paymentMethod ?? "");
  const [accountId, setAccountId] = useState(member.accountId ?? "");
  const { methods } = usePaymentMethods(member.paymentMethod);
  const [paidAmount, setPaidAmount] = useState(
    member.paidAmount === null ? "" : String(member.paidAmount + member.supportAmount),
  );
  const [photo, setPhoto] = useState(member.photo);
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const { villages } = useAdminVillages();
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
      setError(memberMessages.fullNameRequired);
      return;
    }
    if (requiresAgeGroup(village) && !age) {
      setError(memberMessages.pickAgeGroup);
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
        village,
        age: ageForVillage(village, age),
        photo,
      });
      await api.put(`/api/admin/members/${member.id}/payment`, {
        amountTransferred: paidAmount.trim() ? Number(paidAmount) : null,
        ...(paymentMethod ? { paymentMethod } : {}),
        accountId: accountId || null,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const villageOptions = villages.includes(village) ? villages : [village, ...villages];
  const groups = ageGroups.includes(age) || !age ? ageGroups : [age, ...ageGroups];

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
            {memberEdit.fullNameLabel}
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

      <PickList
        id="edit-village"
        label={villageField.label}
        value={village}
        options={villageOptions}
        onChange={(next) => {
          setVillage(next);
          if (!requiresAgeGroup(next)) setAge("");
        }}
        hint={village === OTHER_VILLAGE ? villageField.otherNote : undefined}
      />

      {requiresAgeGroup(village) && (
        <PickList
          id="edit-age"
          label={memberForm.ageLabel}
          value={age}
          options={groups}
          onChange={setAge}
          placeholder={memberForm.agePlaceholder}
        />
      )}

      <PickList
        id="edit-method"
        label={memberEdit.paymentMethodLabel}
        value={paymentMethod}
        options={methodChoiceNames(methods)}
        onChange={(picked) => {
          setPaymentMethod(picked);
          setAccountId("");
        }}
      />

      <PaymentAccountPicker
        accounts={accountsOfMethod(methods, paymentMethod)}
        value={accountId}
        held={member.account}
        label={paymentAccountPicker.label}
        onPick={setAccountId}
      />

      <div>
        <label className="block text-xs font-bold mb-1" htmlFor="edit-amount">
          {memberEdit.paidAmountLabel}
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
          {uploading ? memberEdit.uploading : saving ? memberEdit.saving : memberEdit.save}
        </button>
        <button
          onClick={onCancel}
          className="btn text-sm"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="close">{memberEdit.cancel}</IconLabel>
        </button>
      </div>
    </div>
  );
}
