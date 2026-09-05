"use client";

import PhotoUpload from "@/components/PhotoUpload";
import AgeGroupField from "@/components/form/AgeGroupField";
import ErrorNotice from "@/components/form/ErrorNotice";
import FormSelect from "@/components/form/FormSelect";
import { arabicValidity } from "@/lib/validationMessage";
import { isArabicName } from "@/lib/arabicName";
import { memberForm, signUp, villageField } from "@/lib/texts";
import { OTHER_VILLAGE, requiresAgeGroup } from "@/lib/villages";

export default function StepPerson({
  fullName,
  village,
  age,
  photo,
  villages,
  ages,
  onFullName,
  onVillage,
  onAge,
  onAddAge,
  onPhoto,
  error,
  loading,
  onBack,
  onSubmit,
}: {
  fullName: string;
  village: string;
  age: string;
  photo: string | null;
  villages: string[];
  ages: string[];
  onFullName: (value: string) => void;
  onVillage: (value: string) => void;
  onAge: (value: string) => void;
  onAddAge: (name: string) => void;
  onPhoto: (filename: string) => void;
  error: string;
  loading: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-5 fade-up delay-1">
      <div>
        <label
          htmlFor="signup-fullname"
          className="block text-sm font-bold mb-1.5"
          style={{ color: "var(--text-main)" }}
        >
          {memberForm.fullNameLabel} <span style={{ color: "var(--copper-500)" }}>*</span>
        </label>
        <input
          id="signup-fullname"
          name="fullName"
          value={fullName}
          onChange={(e) => onFullName(e.target.value)}
          {...arabicValidity()}
          maxLength={30}
          placeholder={memberForm.fullNamePlaceholder}
          className="input"
        />
        {fullName && !isArabicName(fullName) && (
          <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
            {memberForm.arabicOnly}
          </p>
        )}
      </div>

      <FormSelect
        id="signup-village"
        label={villageField.label}
        placeholder={villageField.placeholder}
        value={village}
        options={villages}
        onChange={onVillage}
        hint={village === OTHER_VILLAGE ? villageField.otherNote : undefined}
      />

      {requiresAgeGroup(village) && (
        <AgeGroupField
          idPrefix="signup"
          value={age}
          ages={ages}
          onChange={onAge}
          onAdd={onAddAge}
        />
      )}

      <div className="card p-4">
        <PhotoUpload photo={photo} onUpload={onPhoto} label={signUp.photoLabel} showHint={false} />
      </div>

      <ErrorNotice error={error} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="btn"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)", width: "auto" }}
        >
          {signUp.back}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="btn btn-primary flex-1"
        >
          {loading ? signUp.submitting : signUp.submit}
        </button>
      </div>
    </div>
  );
}
