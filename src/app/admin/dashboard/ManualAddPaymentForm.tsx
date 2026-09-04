"use client";

import { MEMBERSHIP_FEE } from "@/lib/donations";
import { usePaymentMethods } from "@/components/admin/usePaymentMethods";
import { methodChoiceNames } from "@/lib/paymentMethodChoices";
import { manualAdd } from "@/lib/texts";
import IconLabel from "@/components/IconLabel";
import PickList from "@/components/admin/PickList";
import UploadZone from "./UploadZone";
import type { emptyPaymentForm } from "./constants";

export type PaymentForm = typeof emptyPaymentForm;

export default function ManualAddPaymentForm({
  form,
  setForm,
  personName,
  proofPreview,
  proofUploading,
  error,
  loading,
  onProof,
  onSkip,
  onSubmit,
}: {
  form: PaymentForm;
  setForm: React.Dispatch<React.SetStateAction<PaymentForm>>;
  personName: string;
  proofPreview: string | null;
  proofUploading: boolean;
  error: string;
  loading: boolean;
  onProof: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSkip: () => void;
  onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
}) {
  const { methods } = usePaymentMethods(form.paymentMethod);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p
        className="p-3 rounded-xl text-xs font-semibold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        <IconLabel name="check">
          {personName} — {manualAdd.personSaved}
        </IconLabel>
      </p>

      <PickList
        id="paymentMethod"
        label={manualAdd.paymentMethodLabel}
        value={form.paymentMethod}
        options={methodChoiceNames(methods)}
        onChange={(paymentMethod) => setForm((p) => ({ ...p, paymentMethod }))}
        placeholder={manualAdd.pick}
        required
      />

      <div>
        <label
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
          htmlFor="paidAmount"
        >
          {manualAdd.paidAmountLabel}
        </label>
        <input
          id="paidAmount"
          type="number"
          inputMode="numeric"
          min={MEMBERSHIP_FEE}
          value={form.paidAmount}
          onChange={(e) => setForm((p) => ({ ...p, paidAmount: e.target.value }))}
          placeholder={String(MEMBERSHIP_FEE)}
          className="input"
          dir="ltr"
        />
      </div>

      <PickList
        id="status"
        label={manualAdd.statusLabel}
        value={form.status}
        options={[
          { value: "ACTIVE", label: manualAdd.statusActive },
          { value: "PENDING", label: manualAdd.statusPending },
        ]}
        onChange={(status) => setForm((p) => ({ ...p, status: status as "PENDING" | "ACTIVE" }))}
      />

      <UploadZone
        label={manualAdd.proofLabel}
        prompt={manualAdd.proofPick}
        preview={proofPreview}
        alt={manualAdd.proofLabel}
        uploading={proofUploading}
        onPick={onProof}
      />

      {error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || proofUploading}
          className="btn btn-primary text-sm flex-1"
        >
          {proofUploading ? manualAdd.submitUploading : loading ? "..." : manualAdd.paymentSubmit}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="btn text-sm"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {manualAdd.skipPayment}
        </button>
      </div>
    </form>
  );
}
