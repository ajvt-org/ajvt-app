"use client";

import type { Dispatch, SetStateAction } from "react";
import ArrowLabel from "@/components/ArrowLabel";
import IconLabel from "@/components/IconLabel";
import DonorNameChoice from "@/components/DonorNameChoice";
import ProofUpload from "@/components/ProofUpload";
import { MEMBERSHIP_FEE, ONLINE_PAYMENT_METHODS as PAYMENT_METHODS } from "@/lib/donations";
import { stepPayment } from "@/lib/texts/stepPayment";
import CopyRow from "./CopyRow";
import ErrorNotice from "@/components/form/ErrorNotice";
import { PAYMENT_CODES, type PaymentValues } from "./constants";

export default function StepPayment({
  form,
  setForm,
  fullName,
  membershipFee,
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
  editing,
  onSubmit,
}: {
  form: PaymentValues;
  setForm: Dispatch<SetStateAction<PaymentValues>>;
  fullName: string;
  membershipFee: number;
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
  editing: boolean;
  onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
}) {
  const amount = String(form.paidAmount || membershipFee);

  return (
    <>
      <div className="fade-up">
        <p
          id="member-method-label"
          className="block text-sm font-bold mb-2"
          style={{ color: "var(--text-main)" }}
        >
          طريقة الدفع <span style={{ color: "var(--copper-500)" }}>*</span>
        </p>
        <div
          className="grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-labelledby="member-method-label"
        >
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={form.paymentMethod === method}
              onClick={() => setForm((p) => ({ ...p, paymentMethod: method }))}
              className="py-3 rounded-xl text-sm font-bold transition-all border-2"
              style={{
                background: form.paymentMethod === method ? "var(--mint-600)" : "white",
                color: form.paymentMethod === method ? "white" : "var(--mint-700)",
                borderColor: form.paymentMethod === method ? "var(--mint-600)" : "var(--mint-200)",
              }}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {form.paymentMethod && (
        <div
          className="rounded-2xl p-4 mt-4 mb-6 fade-up"
          style={{
            background: "linear-gradient(135deg, var(--mint-700), var(--mint-800))",
            border: "1px solid var(--copper-400)",
          }}
        >
          <p className="text-sm font-bold mb-3 text-white">
            <IconLabel name="card">الدفع عبر {form.paymentMethod}</IconLabel>
          </p>
          <div className="space-y-2">
            <CopyRow
              label="رقم المستلم"
              value={PAYMENT_CODES[form.paymentMethod]}
              copied={copied === PAYMENT_CODES[form.paymentMethod]}
              onCopy={() => onCopy(PAYMENT_CODES[form.paymentMethod])}
            />
            <CopyRow
              label="المبلغ"
              value={amount}
              copied={copied === amount}
              onCopy={() => onCopy(amount)}
            />
            <CopyRow
              label="رمز الطلب (اكتبه في سبب التحويل)"
              value={form.referenceCode}
              copied={copied === form.referenceCode}
              onCopy={() => onCopy(form.referenceCode)}
            />
          </div>
          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.6)" }}>
            {stepPayment.payAtLeast(MEMBERSHIP_FEE)}
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
            المبلغ المدفوع (أوقية) <span style={{ color: "var(--copper-500)" }}>*</span>
          </label>
          <input
            id="member-paid"
            type="number"
            inputMode="numeric"
            min={MEMBERSHIP_FEE}
            value={form.paidAmount}
            onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))}
            placeholder={String(MEMBERSHIP_FEE)}
            className="input"
            dir="ltr"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {stepPayment.feeMinimum(membershipFee)}
          </p>
        </div>

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
                جاري إرسال الطلب...
              </span>
            ) : editing ? (
              <ArrowLabel>حفظ التعديلات</ArrowLabel>
            ) : (
              <ArrowLabel>إرسال طلب الانضمام</ArrowLabel>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
