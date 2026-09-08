"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { usePaymentMethods } from "@/components/admin/usePaymentMethods";
import PaymentAccountPicker from "@/components/admin/PaymentAccountPicker";
import { accountsOfMethod, withHeldAccount } from "@/lib/paymentMethodChoices";
import { bankReference as bankReferenceTexts, paymentAccountPicker } from "@/lib/texts";
import { donationFormError } from "@/lib/donationFields";
import { donationEdit } from "@/lib/texts";
import { money } from "@/lib/messages";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import DestinationSelect from "@/components/admin/DestinationSelect";
import FormField from "@/components/admin/FormField";
import DonationShownAs from "./DonationShownAs";
import LinkMemberPanel from "./LinkMemberPanel";
import { proofFromDonation } from "./donationProof";
import { DANGER, FIELD, PRIMARY, QUIET } from "./donationTones";
import { destinationOf, destinationValue, type DestinationOption } from "@/lib/moneyDestination";
import type { DonationResponse, MemberOption, Proof } from "./paymentTypes";

function initial(proof: Proof) {
  return {
    donorName: proof.userId ? "" : proof.donorName || "",
    donorPhone: proof.userId ? "" : proof.donorPhone || "",
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
  members,
  busy,
  onCancel,
  onLink,
  onSaved,
}: {
  proof: Proof;
  destinations: DestinationOption[];
  linkedMember?: MemberOption;
  members: MemberOption[];
  busy: boolean;
  onCancel: () => void;
  onLink: (userId: string) => void;
  onSaved: (changes: Partial<Proof>) => void;
}) {
  const [form, setForm] = useState(initial(proof));
  const { methods } = usePaymentMethods(form.paymentMethod);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const linked = !!proof.userId;

  const set = (changes: Partial<typeof form>) => setForm((p) => ({ ...p, ...changes }));
  const field = (name: string) => `${name}-${proof.id}`;
  const accounts = accountsOfMethod(methods, form.paymentMethod);
  const offeredAccounts = withHeldAccount(accounts, proof.account ?? null);

  const shownAs = form.anonymous ? money.anonymousDonor : form.donorName.trim() || proof.memberName;

  async function save() {
    const invalid = donationFormError({
      donorName: form.donorName.trim() || undefined,
      donorPhone: form.donorPhone,
      amount: form.amount,
    });
    setError(invalid);
    if (invalid) return;

    setSaving(true);
    try {
      const { donation } = await api.patch<DonationResponse>(`/api/admin/donations/${proof.id}`, {
        ...(linked
          ? {}
          : {
              donorName: form.donorName.trim() || null,
              donorPhone: form.donorPhone.trim() || null,
            }),
        donorPhoto: form.donorPhoto,
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
      className="p-2.5 rounded-lg space-y-2"
      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 items-start">
        <DonationShownAs
          name={shownAs}
          linked={linked}
          linkedMember={linkedMember}
          onRelink={() => setPicking((open) => !open)}
        />

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
      </div>

      {picking && (
        <LinkMemberPanel
          members={members}
          busy={busy}
          onPick={(userId) => {
            onLink(userId);
            setPicking(false);
          }}
        />
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 items-start">
        {linked ? (
          <p
            className="text-[11px] font-semibold self-center"
            style={{ color: "var(--text-muted)" }}
          >
            {donationEdit.contactFromAccount}
          </p>
        ) : (
          <>
            <FormField id={field("donor-name")} label={donationEdit.donorName} compact>
              <input
                id={field("donor-name")}
                type="text"
                value={form.donorName}
                onChange={(e) => set({ donorName: e.target.value })}
                maxLength={50}
                className="input text-xs"
                style={FIELD}
              />
            </FormField>

            <FormField id={field("donor-phone")} label={donationEdit.phone} compact>
              <input
                id={field("donor-phone")}
                type="tel"
                dir="ltr"
                value={form.donorPhone}
                onChange={(e) => set({ donorPhone: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                maxLength={8}
                className="input text-xs"
                style={FIELD}
              />
            </FormField>
          </>
        )}

        <FormField id={field("amount")} label={donationEdit.amount} compact>
          <input
            id={field("amount")}
            type="number"
            dir="ltr"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
            className="input text-xs"
            style={FIELD}
          />
        </FormField>

        <FormField id={field("method")} label={donationEdit.paymentMethod} compact>
          <select
            id={field("method")}
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
        </FormField>

        {offeredAccounts.length > 0 && (
          <FormField id={field("account")} label={paymentAccountPicker.label} compact>
            <PaymentAccountPicker
              id={field("account")}
              accounts={accounts}
              value={form.accountId}
              held={proof.account ?? null}
              onPick={(accountId) => set({ accountId })}
              style={FIELD}
            />
          </FormField>
        )}

        <FormField id={field("bank-reference")} label={bankReferenceTexts.label} compact>
          <input
            id={field("bank-reference")}
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
        </FormField>

        <FormField id={field("destination")} label={donationEdit.destination} compact>
          <DestinationSelect
            id={field("destination")}
            destinations={destinations}
            value={form.destinationId}
            onChange={(destinationId) => set({ destinationId })}
            style={FIELD}
          />
        </FormField>

        <label className="flex items-center gap-2 text-xs font-semibold self-center pt-4">
          <input
            type="checkbox"
            checked={form.anonymous}
            onChange={(e) => set({ anonymous: e.target.checked })}
          />
          {donationEdit.anonymous}
        </label>
      </div>

      {error && (
        <div className="p-2 rounded-lg text-xs font-semibold" style={DANGER}>
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={saving} className="btn btn-sm font-bold" style={PRIMARY}>
          {saving ? "..." : <IconLabel name="save">{donationEdit.save}</IconLabel>}
        </button>
        <button onClick={onCancel} className="btn btn-sm font-bold" style={QUIET}>
          {donationEdit.cancel}
        </button>
      </div>
    </div>
  );
}
