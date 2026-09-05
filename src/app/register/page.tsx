"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProgressBar from "@/components/form/ProgressBar";
import PageHeader from "@/components/PageHeader";
import { useFormLists } from "@/components/form/useFormLists";
import { api, errorMessage } from "@/lib/api";
import { goAfterAuthChange } from "@/lib/authNav";
import { isArabicName } from "@/lib/arabicName";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import { auth, members, villages as villageMessages } from "@/lib/messages";
import { signUp } from "@/lib/texts";
import { validatePhone } from "@/lib/utils";
import { HOME_VILLAGE, ageForVillage, requiresAgeGroup } from "@/lib/villages";
import StepCredentials from "./StepCredentials";
import StepPerson from "./StepPerson";

export default function RegisterPage() {
  const router = useRouter();
  const { ages, villages, addAge } = useFormLists();

  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [village, setVillage] = useState(HOME_VILLAGE);
  const [age, setAge] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function goToPerson() {
    setError("");
    const phoneError = validatePhone(phone);
    if (phoneError) return setError(phoneError);
    if (password.length < MIN_PASSWORD_LENGTH) return setError(auth.passwordTooShort);
    if (password !== confirmPassword) return setError(signUp.passwordMismatch);
    setStep(1);
  }

  function pickVillage(next: string) {
    setVillage(next);
    if (!requiresAgeGroup(next)) setAge("");
  }

  async function create() {
    setError("");
    if (!fullName.trim()) return setError(members.fullNameRequired);
    if (!isArabicName(fullName)) return setError(members.fullNameArabicOnly);
    if (!village) return setError(villageMessages.pickVillage);
    if (requiresAgeGroup(village) && !age) return setError(members.pickAgeGroup);

    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        phone,
        password,
        fullName: fullName.trim(),
        village,
        age: ageForVillage(village, age),
        photo,
      });
      goAfterAuthChange(router, "/home");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <PageHeader title={signUp.title} backHref="/" />

      <div className="px-5 py-6 pb-10">
        <ProgressBar stepIndex={step} total={2} />

        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          {signUp.lead}
        </p>

        {step === 0 ? (
          <StepCredentials
            phone={phone}
            password={password}
            confirmPassword={confirmPassword}
            onPhone={setPhone}
            onPassword={setPassword}
            onConfirmPassword={setConfirmPassword}
            error={error}
            onNext={goToPerson}
          />
        ) : (
          <StepPerson
            fullName={fullName}
            village={village}
            age={age}
            photo={photo}
            villages={villages}
            ages={ages}
            onFullName={setFullName}
            onVillage={pickVillage}
            onAge={setAge}
            onAddAge={addAge}
            onPhoto={setPhoto}
            error={error}
            loading={loading}
            onBack={() => {
              setError("");
              setStep(0);
            }}
            onSubmit={create}
          />
        )}
      </div>
    </div>
  );
}
