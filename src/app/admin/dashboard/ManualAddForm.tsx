"use client";

import { MEMBERSHIP_FEE, PAYMENT_METHODS } from "@/lib/donations";
import { manualAdd, memberForm, villageField, villagesDialog } from "@/lib/texts";
import { OTHER_VILLAGE, requiresAgeGroup } from "@/lib/villages";
import IconLabel from "@/components/IconLabel";
import PickList from "@/components/admin/PickList";
import UploadZone from "./UploadZone";
import type { AgeGroup } from "./types";
import type { emptyManualForm } from "./constants";

export type ManualForm = typeof emptyManualForm;

export default function ManualAddForm({
  form,
  setForm,
  ageGroups,
  villages,
  photoPreview,
  photoUploading,
  proofPreview,
  proofUploading,
  error,
  loading,
  onPhoto,
  onProof,
  onManageAgeGroups,
  onManageVillages,
  onSubmit,
}: {
  form: ManualForm;
  setForm: React.Dispatch<React.SetStateAction<ManualForm>>;
  ageGroups: AgeGroup[];
  villages: string[];
  photoPreview: string | null;
  photoUploading: boolean;
  proofPreview: string | null;
  proofUploading: boolean;
  error: string;
  loading: boolean;
  onPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProof: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManageAgeGroups: () => void;
  onManageVillages: () => void;
  onSubmit: (e: React.SubmitEvent<HTMLFormElement>) => void;
}) {
  const manageLink = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-bold"
      style={{ color: "var(--mint-600)" }}
    >
      <IconLabel name="tag">{label}</IconLabel>
    </button>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div
        className="flex items-center gap-2 p-2.5 rounded-lg"
        style={{ background: "var(--mint-100)" }}
      >
        <input
          type="checkbox"
          id="phoneUnknown"
          checked={form.phoneUnknown}
          onChange={(e) =>
            setForm((p) => ({ ...p, phoneUnknown: e.target.checked, accountPhone: "" }))
          }
          className="w-4 h-4"
        />
        <label
          htmlFor="phoneUnknown"
          className="text-sm font-bold"
          style={{ color: "var(--mint-700)" }}
        >
          <IconLabel name="ban">{manualAdd.phoneUnknown}</IconLabel>
        </label>
      </div>

      {!form.phoneUnknown && (
        <div>
          <label
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
            htmlFor="accountPhone"
          >
            {manualAdd.accountPhoneLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
          </label>
          <input
            id="accountPhone"
            type="tel"
            dir="ltr"
            value={form.accountPhone}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                accountPhone: e.target.value.replace(/\D/g, "").slice(0, 8),
              }))
            }
            placeholder="2XXXXXXX"
            maxLength={8}
            required
            className="input"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {manualAdd.accountPhoneHint}
          </p>
        </div>
      )}

      <div>
        <label
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
          htmlFor="fullName"
        >
          {manualAdd.fullNameLabel}
        </label>
        <input
          id="fullName"
          type="text"
          value={form.fullName}
          onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
          maxLength={30}
          required
          className="input"
        />
      </div>

      <UploadZone
        label={manualAdd.photoLabel}
        prompt={manualAdd.photoPick}
        preview={photoPreview}
        alt={manualAdd.photoLabel}
        uploading={photoUploading}
        onPick={onPhoto}
      />

      <PickList
        id="village"
        label={villageField.label}
        value={form.village}
        options={villages}
        onChange={(village) =>
          setForm((p) => ({ ...p, village, age: requiresAgeGroup(village) ? p.age : "" }))
        }
        required
        action={manageLink(villagesDialog.manage, onManageVillages)}
        hint={form.village === OTHER_VILLAGE ? villageField.otherNote : undefined}
      />

      {requiresAgeGroup(form.village) && (
        <PickList
          id="age"
          label={memberForm.ageLabel}
          value={form.age}
          options={ageGroups.map((g) => g.name)}
          onChange={(age) => setForm((p) => ({ ...p, age }))}
          placeholder={manualAdd.pick}
          required
          action={manageLink(manualAdd.manageAgeGroups, onManageAgeGroups)}
        />
      )}

      <PickList
        id="paymentMethod"
        label={manualAdd.paymentMethodLabel}
        value={form.paymentMethod}
        options={[...PAYMENT_METHODS]}
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

      <button
        type="submit"
        disabled={loading || proofUploading || photoUploading}
        className="btn btn-primary text-sm"
      >
        {proofUploading || photoUploading
          ? manualAdd.submitUploading
          : loading
            ? "..."
            : manualAdd.submit}
      </button>
    </form>
  );
}
