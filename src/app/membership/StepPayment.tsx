"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import ArrowLabel from "@/components/ArrowLabel";
import IconLabel from "@/components/IconLabel";
import DonorNameChoice from "@/components/DonorNameChoice";
import ProofUpload from "@/components/ProofUpload";
import { stepPayment as texts } from "@/lib/texts";
import CopyRow from "./CopyRow";
import ErrorNotice from "@/components/form/ErrorNotice";
import { type PaymentValues } from "./constants";
import { usePayableMethods } from "@/lib/usePayableMethods";
import PaymentMethodChoice from "@/components/PaymentMethodChoice";
import AccountChoice from "./AccountChoice";
import { accountToPreselect } from "@/lib/paymentMethodChoices";

export default function StepPayment({
  form,
  setForm,
  fullName,
  membershipFee,
  asksBankReference,
  copied,
  onCopy,
  surplus,
  wantsName,
  setWantsName,
  proofFilename,
  setProofFilename,
  setProofUploading,
  error,
  loading,
  proofUploading,
  reference,
  submitLabel,
  onSubmit,
}: {
  form: PaymentValues;
  setForm: Dispatch<SetStateAction<PaymentValues>>;
  fullName: string;
  membershipFee: number;
  asksBankReference: boolean;
  copied: string | null;
  onCopy: (value: string) => void;
  surplus: number;
  wantsName: boolean | null;
  setWantsName: (value: boolean) => void;
  proofFilename: string | null;
  setProofFilename: (filename: string | null) => void;
  setProofUploading: (uploading: boolean) => void;
  error: string;
  loading: boolean;
  proofUploading: boolean;
  reference: { label: string; value: string } | null;
  submitLabel: string;
  onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
}) {
  const offer = usePayableMethods();
  const amount = String(form.paidAmount || membershipFee);
  const chosen = offer.methods.find((method) => method.name === form.paymentMethod);
  const accounts = chosen?.accounts ?? [];
  const preselected = accountToPreselect(accounts, form.accountId);
  const picked = accounts.find((a) => a.id === preselected);
  const receivingCode = picked?.code ?? "";

  useEffect(() => {
    if (!form.accountId && preselected) setForm((p) => ({ ...p, accountId: preselected }));
  }, [form.accountId, preselected, setForm]);

  return (
    <>
      <div className="fade-up">
        <p
          id="member-method-label"
          className="block text-sm font-bold mb-2"
          style={{ color: "var(--text-main)" }}
        >
          {texts.methodLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
        </p>
        <PaymentMethodChoice
          offer={offer}
          value={form.paymentMethod}
          onPick={(name) => setForm((p) => ({ ...p, paymentMethod: name, accountId: "" }))}
          labelledBy="member-method-label"
        />
      </div>

      {accounts.length > 1 && (
        <AccountChoice
          accounts={accounts}
          value={form.accountId}
          onPick={(id) => setForm((p) => ({ ...p, accountId: id }))}
        />
      )}

      {form.paymentMethod && (
        <div
          className="rounded-2xl p-4 fade-up"
          style={{
            background: "linear-gradient(135deg, var(--mint-700), var(--mint-800))",
            border: "1px solid var(--copper-400)",
          }}
        >
          <p className="text-sm font-bold mb-3 text-white">
            <IconLabel name="card">{texts.payingWith(form.paymentMethod)}</IconLabel>
          </p>
          <div className="space-y-2">
            {receivingCode && (
              <CopyRow
                label={texts.receivingNumber}
                value={receivingCode}
                copied={copied === receivingCode}
                onCopy={() => onCopy(receivingCode)}
              />
            )}
            <CopyRow
              label={texts.amount}
              value={amount}
              copied={copied === amount}
              onCopy={() => onCopy(amount)}
            />
            {reference && (
              <CopyRow
                label={reference.label}
                value={reference.value}
                copied={copied === reference.value}
                onCopy={() => onCopy(reference.value)}
              />
            )}
          </div>
          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.6)" }}>
            {texts.payAtLeast(membershipFee)}
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5 fade-up delay-1">
        <div>
          <label
            htmlFor="member-paid"
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
          >
            {texts.paidLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
          </label>
          <input
            id="member-paid"
            type="number"
            inputMode="numeric"
            min={membershipFee}
            value={form.paidAmount}
            onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))}
            placeholder={String(membershipFee)}
            className="input"
            dir="ltr"
          />
        </div>

        {asksBankReference && (
          <div>
            <label
              htmlFor="member-bank-reference"
              className="block text-sm font-bold mb-1.5"
              style={{ color: "var(--text-main)" }}
            >
              {texts.bankReference}
            </label>
            <input
              id="member-bank-reference"
              type="text"
              inputMode="numeric"
              value={form.bankReference}
              onChange={(e) => setForm((p) => ({ ...p, bankReference: e.target.value }))}
              maxLength={40}
              className="input"
              dir="ltr"
            />
          </div>
        )}

        {surplus > 0 && (
          <DonorNameChoice
            wantsName={wantsName}
            onPick={setWantsName}
            memberName={fullName.trim() || undefined}
          />
        )}

        <ProofUpload
          existingProof={proofFilename}
          onUploaded={setProofFilename}
          onUploadingChange={setProofUploading}
        />

        <ErrorNotice error={error} />

        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            disabled={loading || proofUploading}
            className="btn btn-primary flex-1"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {texts.sending}
              </span>
            ) : (
              <ArrowLabel>{submitLabel}</ArrowLabel>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
