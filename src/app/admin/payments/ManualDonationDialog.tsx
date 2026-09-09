"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { usePaymentMethods } from "@/components/admin/usePaymentMethods";
import PaymentAccountPicker from "@/components/admin/PaymentAccountPicker";
import { accountsOfMethod } from "@/lib/paymentMethodChoices";
import { donationFormError } from "@/lib/donationFields";
import { linkedAccount } from "@/lib/linkedAccount";
import {
  bankReference as bankReferenceTexts,
  manualDonation,
  paymentAccountPicker,
} from "@/lib/texts";
import DialogHeader from "@/components/DialogHeader";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import Sheet from "@/components/Sheet";
import DestinationSelect from "@/components/admin/DestinationSelect";
import FormField from "@/components/admin/FormField";
import LinkMemberPanel from "./LinkMemberPanel";
import MemberIdentity from "./MemberIdentity";
import { proofFromDonation } from "./donationProof";
import { DANGER, QUIET } from "./donationTones";
import { destinationOf, type DestinationOption } from "@/lib/moneyDestination";
import type { DonationResponse, MemberOption, Proof } from "./paymentTypes";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  donorName: "",
  donorPhone: "",
  amount: "",
  donorPhoto: "",
  paymentMethod: "",
  accountId: "",
  bankReference: "",
  destinationId: "",
  proof: "",
  paidOn: "",
  anonymous: false,
};

export default function ManualDonationDialog({
  destinations,
  members,
  onClose,
  onCreated,
}: {
  destinations: DestinationOption[];
  members: MemberOption[];
  onClose: () => void;
  onCreated: (proof: Proof) => void;
}) {
  const { methods } = usePaymentMethods();
  const [form, setForm] = useState({ ...EMPTY, paidOn: today() });
  const [account, setAccount] = useState<MemberOption | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (changes: Partial<typeof EMPTY>) => setForm((p) => ({ ...p, ...changes }));
  const accounts = accountsOfMethod(methods, form.paymentMethod);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const invalid = donationFormError({ ...form, donorName: form.donorName.trim() || undefined });
    setError(invalid);
    if (invalid) return;

    setSaving(true);
    try {
      const { donation } = await api.post<DonationResponse>("/api/admin/donations", {
        donorName: account ? null : form.donorName.trim() || null,
        donorPhone: account ? null : form.donorPhone.trim() || null,
        donorPhoto: form.donorPhoto || null,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod || null,
        accountId: form.accountId || null,
        bankReference: form.bankReference.trim() || null,
        ...destinationOf(destinations, form.destinationId),
        proof: form.proof || null,
        paidOn: form.paidOn || null,
        anonymous: form.anonymous,
        userId: account?.userId ?? null,
      });
      onCreated(proofFromDonation(donation, destinations));
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
        title={<IconLabel name="plus">{manualDonation.title}</IconLabel>}
        onClose={onClose}
      />

      <form onSubmit={submit} className="p-5 space-y-3">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {manualDonation.intro}
        </p>

        <PhotoUpload
          photo={form.donorPhoto || null}
          imageUrlPrefix="/api/files/donation"
          variant="avatar"
          label={manualDonation.donorPhoto}
          placeholderIcon="user"
          onUpload={(filename) => set({ donorPhoto: filename })}
        />
        <PhotoUpload
          photo={form.proof || null}
          variant="cover"
          label={manualDonation.proof}
          placeholderIcon="receipt"
          onUpload={(filename) => set({ proof: filename })}
        />

        <div>
          <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
            {manualDonation.account}
          </p>
          <p className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
            {manualDonation.accountHint}
          </p>
          {account ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <MemberIdentity member={account} />
                <button
                  type="button"
                  onClick={() => setAccount(null)}
                  className="text-xs px-2.5 py-1 rounded-lg font-bold shrink-0"
                  style={QUIET}
                >
                  {manualDonation.unlink}
                </button>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {manualDonation.contactFromAccount}
              </p>
            </div>
          ) : picking ? (
            <LinkMemberPanel
              members={members}
              busy={saving}
              onPick={(userId) => {
                setAccount(linkedAccount(members, userId) ?? null);
                setPicking(false);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
              style={QUIET}
            >
              <IconLabel name="link">{manualDonation.account}</IconLabel>
            </button>
          )}
        </div>

        {!account && (
          <>
            <FormField id="manual-donor-name" label={manualDonation.donorName}>
              <input
                id="manual-donor-name"
                type="text"
                value={form.donorName}
                onChange={(e) => set({ donorName: e.target.value })}
                maxLength={50}
                className="input"
              />
            </FormField>

            <FormField id="manual-donor-phone" label={manualDonation.phone}>
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
            </FormField>
          </>
        )}

        <FormField id="manual-amount" label={manualDonation.amount}>
          <input
            id="manual-amount"
            type="number"
            dir="ltr"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
            className="input"
          />
        </FormField>

        <FormField id="manual-paid-on" label={manualDonation.paidOn}>
          <input
            id="manual-paid-on"
            type="date"
            dir="ltr"
            value={form.paidOn}
            onChange={(e) => set({ paidOn: e.target.value })}
            className="input"
          />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {manualDonation.paidOnHint}
          </p>
        </FormField>

        <FormField id="manual-payment-method" label={manualDonation.paymentMethod}>
          <select
            id="manual-payment-method"
            value={form.paymentMethod}
            onChange={(e) => set({ paymentMethod: e.target.value, accountId: "" })}
            className="input"
          >
            <option value="">{manualDonation.methodUnset}</option>
            {methods.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </FormField>

        {accounts.length > 0 && (
          <FormField id="manual-payment-account" label={paymentAccountPicker.label}>
            <PaymentAccountPicker
              id="manual-payment-account"
              accounts={accounts}
              value={form.accountId}
              onPick={(accountId) => set({ accountId })}
            />
          </FormField>
        )}

        <FormField id="manual-bank-reference" label={bankReferenceTexts.label}>
          <input
            id="manual-bank-reference"
            value={form.bankReference}
            onChange={(e) => set({ bankReference: e.target.value })}
            maxLength={40}
            dir="ltr"
            className="input"
          />
        </FormField>

        <FormField id="manual-destination" label={manualDonation.destination}>
          <DestinationSelect
            id="manual-destination"
            destinations={destinations}
            value={form.destinationId}
            onChange={(destinationId) => set({ destinationId })}
            className="input"
          />
        </FormField>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.anonymous}
            onChange={(e) => set({ anonymous: e.target.checked })}
          />
          {manualDonation.anonymous}
        </label>

        {error && (
          <div className="p-3 rounded-xl text-sm font-semibold" style={DANGER}>
            <Icon name="warning" size={13} className="icon-inline" /> {error}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn btn-primary text-sm">
          {saving ? "..." : manualDonation.submit}
        </button>
      </form>
    </Sheet>
  );
}
