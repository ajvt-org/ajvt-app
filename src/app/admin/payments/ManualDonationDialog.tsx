"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { usePaymentMethods } from "@/components/admin/usePaymentMethods";
import { donationFormError } from "@/lib/donationFields";
import { linkedAccount } from "@/lib/linkedAccount";
import { nameAdoptedOnLink } from "@/lib/donorName";
import { manualDonation } from "@/lib/texts";
import DialogHeader from "@/components/DialogHeader";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import Sheet from "@/components/Sheet";
import DestinationSelect from "@/components/admin/DestinationSelect";
import LinkMemberPanel from "./LinkMemberPanel";
import MemberIdentity from "./MemberIdentity";
import { proofFromDonation } from "./donationProof";
import { DANGER_BOX, QUIET } from "./donationTones";
import { destinationOf, type DestinationOption } from "@/lib/moneyDestination";
import type { DonationResponse, MemberOption, Proof } from "./paymentTypes";

const EMPTY = {
  donorName: "",
  donorPhone: "",
  amount: "",
  donorPhoto: "",
  paymentMethod: "",
  destinationId: "",
  proof: "",
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
  const [form, setForm] = useState(EMPTY);
  const [account, setAccount] = useState<MemberOption | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (changes: Partial<typeof EMPTY>) => setForm((p) => ({ ...p, ...changes }));

  const adopted = nameAdoptedOnLink(account);
  const donorName = adopted ?? form.donorName;

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const invalid = donationFormError({ ...form, donorName }, true);
    setError(invalid);
    if (invalid) return;

    setSaving(true);
    try {
      const { donation } = await api.post<DonationResponse>("/api/admin/donations", {
        donorName: donorName.trim(),
        donorPhone: form.donorPhone.trim() || null,
        donorPhoto: form.donorPhoto || null,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod || null,
        ...destinationOf(destinations, form.destinationId),
        proof: form.proof || null,
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
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="manual-donor-name"
          >
            {manualDonation.donorName} <span style={{ color: "var(--copper-500)" }}>*</span>
          </label>
          <input
            id="manual-donor-name"
            type="text"
            value={donorName}
            onChange={(e) => set({ donorName: e.target.value })}
            readOnly={adopted !== null}
            maxLength={50}
            required
            className="input"
          />
          {adopted !== null && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {manualDonation.donorNameFromAccount}
            </p>
          )}
        </div>

        <div>
          <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
            {manualDonation.account}
          </p>
          <p className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
            {manualDonation.accountHint}
          </p>
          {account ? (
            <div className="flex items-center justify-between gap-2">
              <MemberIdentity member={account} />
              <button
                type="button"
                onClick={() => setAccount(null)}
                className="text-xs px-2.5 py-1 rounded-lg font-bold shrink-0"
                style={QUIET}
              >
                {manualDonation.clearAccount}
              </button>
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

        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="manual-donor-phone"
          >
            {manualDonation.phone}
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
            {manualDonation.amount} <span style={{ color: "var(--copper-500)" }}>*</span>
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
            {manualDonation.paymentMethod}
          </label>
          <select
            id="manual-payment-method"
            value={form.paymentMethod}
            onChange={(e) => set({ paymentMethod: e.target.value })}
            className="input"
          >
            <option value="">{manualDonation.methodUnset}</option>
            {methods.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
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
            {manualDonation.destination}
          </label>
          <DestinationSelect
            id="manual-activity"
            destinations={destinations}
            value={form.destinationId}
            onChange={(destinationId) => set({ destinationId })}
            className="input"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl text-sm font-semibold" style={DANGER_BOX}>
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
