"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { usePaymentMethods } from "@/components/admin/usePaymentMethods";
import PaymentAccountPicker from "@/components/admin/PaymentAccountPicker";
import { accountsOfMethod } from "@/lib/paymentMethodChoices";
import { bankReference as bankReferenceTexts } from "@/lib/texts";
import { donationFormError } from "@/lib/donationFields";
import { donationEdit } from "@/lib/texts";
import { money } from "@/lib/messages";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import DestinationSelect from "@/components/admin/DestinationSelect";
import MemberIdentity from "./MemberIdentity";
import { proofFromDonation } from "./donationProof";
import { DANGER_BOX, FIELD, PRIMARY, QUIET } from "./donationTones";
import { destinationOf, destinationValue, type DestinationOption } from "@/lib/moneyDestination";
import type { DonationResponse, MemberOption, Proof } from "./paymentTypes";

function initial(proof: Proof) {
  return {
    donorName: proof.donorName || "",
    donorPhone: proof.donorPhone || "",
    donorPhoto: proof.donorPhoto || null,
    amount: proof.amount != null ? String(proof.amount) : "",
    paymentMethod: proof.paymentMethod || "",
    accountId: proof.accountId || "",
    bankReference: proof.bankReference || "",
    destinationId: destinationValue(proof),
    proof: proof.proof || null,
    anonymous: proof.anonymous ?? false,
  };
}

export default function DonationEditForm({
  proof,
  destinations,
  linkedMember,
  onCancel,
  onRelink,
  onSaved,
}: {
  proof: Proof;
  destinations: DestinationOption[];
  linkedMember?: MemberOption;
  onCancel: () => void;
  onRelink: () => void;
  onSaved: (changes: Partial<Proof>) => void;
}) {
  const [form, setForm] = useState(initial(proof));
  const { methods } = usePaymentMethods(form.paymentMethod);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const linked = !!proof.userId;

  const set = (changes: Partial<typeof form>) => setForm((p) => ({ ...p, ...changes }));
  const accounts = accountsOfMethod(methods, form.paymentMethod);

  const shownAs = form.anonymous ? money.anonymousDonor : form.donorName.trim() || proof.memberName;

  async function save() {
    const invalid = donationFormError(
      {
        donorName: form.donorName.trim() || undefined,
        donorPhone: form.donorPhone,
        amount: form.amount,
      },
      !linked,
    );
    setError(invalid);
    if (invalid) return;

    setSaving(true);
    try {
      const { donation } = await api.patch<DonationResponse>(`/api/admin/donations/${proof.id}`, {
        donorName: form.donorName.trim() || null,
        donorPhoto: form.donorPhoto,
        donorPhone: form.donorPhone.trim() || null,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod || null,
        accountId: form.accountId || null,
        bankReference: form.bankReference.trim() || null,
        ...destinationOf(destinations, form.destinationId),
        proof: form.proof,
        anonymous: form.anonymous,
      });
      onSaved(proofFromDonation(donation, destinations));
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
      <div className="rounded-lg p-2 space-y-1.5" style={FIELD}>
        <p className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
          {donationEdit.shownAs}
        </p>
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          {shownAs}
        </p>
        {linkedMember && <MemberIdentity member={linkedMember} size={26} />}
        <button
          onClick={onRelink}
          className="text-[11px] px-2 py-1 rounded-lg font-bold"
          style={QUIET}
        >
          <IconLabel name="link" size={11}>
            {linked ? donationEdit.changeLink : donationEdit.link}
          </IconLabel>
        </button>
      </div>

      <PhotoUpload
        photo={form.proof}
        variant="cover"
        label={donationEdit.proof}
        placeholderIcon="receipt"
        onUpload={(filename) => set({ proof: filename })}
      />

      <PhotoUpload
        photo={form.donorPhoto}
        imageUrlPrefix="/api/files/donation"
        variant="avatar"
        label={donationEdit.donorPhoto}
        placeholderIcon="user"
        onUpload={(filename) => set({ donorPhoto: filename })}
      />

      <label className="block text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
        {donationEdit.donorName}
      </label>
      <input
        type="text"
        aria-label={donationEdit.donorName}
        placeholder={donationEdit.donorName}
        value={form.donorName}
        onChange={(e) => set({ donorName: e.target.value })}
        maxLength={50}
        className="input text-xs"
        style={FIELD}
      />

      <label className="flex items-center gap-2 text-xs font-semibold">
        <input
          type="checkbox"
          checked={form.anonymous}
          onChange={(e) => set({ anonymous: e.target.checked })}
        />
        {donationEdit.anonymous}
      </label>

      <input
        type="tel"
        dir="ltr"
        aria-label={donationEdit.phone}
        placeholder={donationEdit.phone}
        value={form.donorPhone}
        onChange={(e) => set({ donorPhone: e.target.value.replace(/\D/g, "").slice(0, 8) })}
        maxLength={8}
        className="input text-xs"
        style={FIELD}
      />
      <input
        type="number"
        dir="ltr"
        aria-label={donationEdit.amount}
        placeholder={donationEdit.amount}
        value={form.amount}
        onChange={(e) => set({ amount: e.target.value })}
        className="input text-xs"
        style={FIELD}
      />
      <select
        aria-label={donationEdit.methodUnset}
        value={form.paymentMethod}
        onChange={(e) => set({ paymentMethod: e.target.value, accountId: "" })}
        className="input text-xs"
        style={FIELD}
      >
        <option value="">{donationEdit.methodUnset}</option>
        {methods.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name}
          </option>
        ))}
      </select>

      <PaymentAccountPicker
        accounts={accounts}
        value={form.accountId}
        held={proof.account ?? null}
        onPick={(accountId) => set({ accountId })}
        style={FIELD}
      />

      <input
        aria-label={bankReferenceTexts.label}
        placeholder={bankReferenceTexts.label}
        value={form.bankReference}
        onChange={(e) => set({ bankReference: e.target.value })}
        maxLength={40}
        dir="ltr"
        className="input text-xs"
        style={FIELD}
      />

      {proof.repeatedReference && (
        <p className="text-xs font-semibold" style={{ color: "var(--copper-500)" }}>
          {bankReferenceTexts.repeated}
        </p>
      )}

      <DestinationSelect
        destinations={destinations}
        value={form.destinationId}
        onChange={(destinationId) => set({ destinationId })}
        style={FIELD}
      />

      {error && (
        <div className="p-2 rounded-lg text-xs font-semibold" style={DANGER_BOX}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={PRIMARY}
        >
          {saving ? "..." : <IconLabel name="save">{donationEdit.save}</IconLabel>}
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "white", color: "var(--text-muted)" }}
        >
          {donationEdit.cancel}
        </button>
      </div>
    </div>
  );
}
