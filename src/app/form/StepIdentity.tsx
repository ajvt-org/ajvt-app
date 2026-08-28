"use client";

import type { Dispatch, SetStateAction } from "react";
import ArrowLabel from "@/components/ArrowLabel";
import IconLabel from "@/components/IconLabel";
import { arabicValidity } from "@/lib/validationMessage";
import { memberForm, villageField } from "@/lib/texts";
import { OTHER_VILLAGE, requiresAgeGroup } from "@/lib/villages";
import ErrorNotice from "./ErrorNotice";
import FormSelect from "./FormSelect";
import PhoneInput from "./PhoneInput";
import { isArabicName, type FormValues } from "./constants";

export default function StepIdentity({
  form,
  setForm,
  authenticated,
  villages,
  ages,
  onVillageSelect,
  error,
  onNext,
}: {
  form: FormValues;
  setForm: Dispatch<SetStateAction<FormValues>>;
  authenticated: boolean;
  villages: string[];
  ages: string[];
  onVillageSelect: (village: string) => void;
  error: string;
  onNext: () => void;
}) {
  const asksForAge = requiresAgeGroup(form.village);

  return (
    <div className="space-y-5 fade-up delay-1">
      <div>
        <label
          htmlFor="member-fullname"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          {memberForm.fullNameLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        <input
          id="member-fullname"
          name="fullName"
          value={form.fullName}
          onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
          required
          {...arabicValidity()}
          maxLength={30}
          placeholder={memberForm.fullNamePlaceholder}
          className="input"
        />
        {form.fullName && !isArabicName(form.fullName) && (
          <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
            {memberForm.arabicOnly}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="member-phone"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          {memberForm.phoneLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        {authenticated ? (
          <>
            <p className="input flex items-center" dir="ltr" id="member-phone">
              {form.phone}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {memberForm.phoneAccountNote}
            </p>
          </>
        ) : (
          <>
            <PhoneInput
              id="member-phone"
              value={form.phone}
              onChange={(val) => setForm((p) => ({ ...p, phone: val }))}
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {memberForm.phoneHint}
            </p>
          </>
        )}
      </div>

      <FormSelect
        id="member-village"
        label={villageField.label}
        placeholder={villageField.placeholder}
        value={form.village}
        options={villages}
        onChange={onVillageSelect}
        hint={form.village === OTHER_VILLAGE ? villageField.otherNote : undefined}
      />

      {asksForAge && (
        <div>
          <FormSelect
            id="member-age"
            label={memberForm.ageLabel}
            placeholder={memberForm.agePlaceholder}
            value={form.age}
            options={ages}
            onChange={(age) => setForm((p) => ({ ...p, age }))}
          />
          {form.age && (
            <p className="text-xs mt-1 font-semibold" style={{ color: "var(--mint-600)" }}>
              <IconLabel name="check">{form.age}</IconLabel>
            </p>
          )}
        </div>
      )}

      <ErrorNotice error={error} />

      <button type="button" onClick={onNext} className="btn btn-primary mt-2">
        <ArrowLabel>{memberForm.next}</ArrowLabel>
      </button>
    </div>
  );
}
