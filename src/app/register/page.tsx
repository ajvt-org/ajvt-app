"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProgressBar from "@/components/form/ProgressBar";
import PageHeader from "@/components/PageHeader";
import { useFormLists } from "@/components/form/useFormLists";
import { api, errorMessage } from "@/lib/api";
import { goAfterAuthChange } from "@/lib/authNav";
import { isArabicName } from "@/lib/arabicName";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import { auth, members, villages as villageMessages } from "@/lib/messages";
import { signUp } from "@/lib/texts";
import { safeNextPath, validatePhone } from "@/lib/utils";
import { HOME_VILLAGE, ageForVillage, requiresAgeGroup } from "@/lib/villages";
import StepCredentials from "./StepCredentials";
import StepPerson from "./StepPerson";
import { DRAFT_KEY, readDraft, type SignUpDraft } from "./draft";

const EMPTY: SignUpDraft = {
  phone: "",
  fullName: "",
  village: HOME_VILLAGE,
  age: "",
  photo: null,
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const backHref = safeNextPath(useSearchParams().get("from"), "/");
  const { ages, villages, addAge } = useFormLists();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SignUpDraft>(EMPTY);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const draft = readDraft(sessionStorage.getItem(DRAFT_KEY));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((p) => ({ ...p, ...draft }));
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    const timeout = setTimeout(() => sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)), 300);
    return () => clearTimeout(timeout);
  }, [form, restored]);

  function set<K extends keyof SignUpDraft>(field: K, value: SignUpDraft[K]) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function goToPerson() {
    setError("");
    const phoneError = validatePhone(form.phone);
    if (phoneError) return setError(phoneError);
    if (password.length < MIN_PASSWORD_LENGTH) return setError(auth.passwordTooShort);
    if (password !== confirmPassword) return setError(signUp.passwordMismatch);
    setStep(1);
  }

  function pickVillage(next: string) {
    setForm((p) => ({ ...p, village: next, age: requiresAgeGroup(next) ? p.age : "" }));
  }

  async function create() {
    setError("");
    if (!form.fullName.trim()) return setError(members.fullNameRequired);
    if (!isArabicName(form.fullName)) return setError(members.fullNameArabicOnly);
    if (!form.village) return setError(villageMessages.pickVillage);
    if (requiresAgeGroup(form.village) && !form.age) return setError(members.pickAgeGroup);

    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        phone: form.phone,
        password,
        fullName: form.fullName.trim(),
        village: form.village,
        age: ageForVillage(form.village, form.age),
        photo: form.photo,
      });
      sessionStorage.removeItem(DRAFT_KEY);
      goAfterAuthChange(router, "/home");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <PageHeader title={signUp.title} backHref={backHref} />

      <div className="px-5 py-6 pb-10">
        <ProgressBar stepIndex={step} total={2} />

        {step === 0 ? (
          <StepCredentials
            phone={form.phone}
            password={password}
            confirmPassword={confirmPassword}
            onPhone={(value) => set("phone", value)}
            onPassword={setPassword}
            onConfirmPassword={setConfirmPassword}
            error={error}
            onNext={goToPerson}
          />
        ) : (
          <StepPerson
            fullName={form.fullName}
            village={form.village}
            age={form.age}
            photo={form.photo}
            villages={villages}
            ages={ages}
            onFullName={(value) => set("fullName", value)}
            onVillage={pickVillage}
            onAge={(value) => set("age", value)}
            onAddAge={addAge}
            onPhoto={(value) => set("photo", value)}
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
