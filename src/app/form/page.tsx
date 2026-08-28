"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { validatePhone, loginPathWithNext, safeNextPath } from "@/lib/utils";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import { auth, members as memberMessages, villages as villageMessages } from "@/lib/messages";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import { generateReferenceCode } from "@/lib/referenceCode";
import { MEMBERSHIP_FEE, validatePaidAmount } from "@/lib/donations";
import { surplusOf } from "@/lib/membershipSurplus";
import { validateDonorChoice } from "@/lib/donorChoice";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import BackButton from "@/components/BackButton";
import { goAfterAuthChange } from "@/lib/authNav";
import { HOME_VILLAGE, ageForVillage, requiresAgeGroup } from "@/lib/villages";
import PageLoading from "@/components/PageLoading";
import ProgressBar from "./ProgressBar";
import StepIdentity from "./StepIdentity";
import StepAccount from "./StepAccount";
import StepPayment from "./StepPayment";
import SubmittedCard from "./SubmittedCard";
import { useFormLists } from "./useFormLists";
import {
  DRAFT_KEY,
  IDLE_TIMEOUT_MS,
  STEPS_AUTHENTICATED,
  STEPS_NEW,
  isArabicName,
} from "./constants";

export default function FormPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell flex">
          <PageLoading />
        </div>
      }
    >
      <FormPageInner />
    </Suspense>
  );
}

function FormPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const cameFrom = safeNextPath(searchParams.get("from"), "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [proofFilename, setProofFilename] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [membershipFee, setMembershipFee] = useState(MEMBERSHIP_FEE);

  useEffect(() => {
    api
      .get<{ settings: { membershipFee: number } }>("/api/settings")
      .then((d) => setMembershipFee(d.settings.membershipFee))
      .catch(() => {});
  }, []);
  const [submitted, setSubmitted] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);

  const { ages, villages, addAge } = useFormLists();

  const [wantsName, setWantsName] = useState<boolean | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    village: HOME_VILLAGE,
    age: "",
    paymentMethod: "",
    paidAmount: "",
    referenceCode: "",
  });

  const surplus = surplusOf(form.paidAmount, membershipFee);

  const steps = editId ? STEPS_AUTHENTICATED : authenticated ? STEPS_AUTHENTICATED : STEPS_NEW;
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    async function load() {
      if (editId) {
        const meRes = await fetch("/api/user/me");
        if (meRes.status === 401) {
          router.push(loginPathWithNext("/login"));
          return;
        }
        const me = await meRes.json();
        const memberRes = await fetch(`/api/members/${editId}`);
        if (!memberRes.ok) {
          router.push("/profile");
          return;
        }
        const member = await memberRes.json();
        if (member.status === "ACTIVE") {
          router.push("/profile");
          return;
        }
        setForm({
          fullName: member.fullName || "",
          phone: me?.phone || member.phone || "",
          village: member.village || HOME_VILLAGE,
          age: member.age || "",
          paymentMethod: member.paymentMethod || "",
          paidAmount:
            member.paidAmount != null
              ? String(member.paidAmount + (member.supportAmount ?? 0))
              : "",
          referenceCode: member.referenceCode || generateReferenceCode(),
        });
        if (member.surplusAnonymous) setWantsName(false);
        if (member.paymentProof) setProofFilename(member.paymentProof);
        if (member.photo) setPhoto(member.photo);
        setAuthenticated(true);
        setCheckingAuth(false);
        return;
      }

      let initialPhone = "";
      const meRes = await fetch("/api/user/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setAuthenticated(true);
        initialPhone = me?.phone || "";
        const mine = me?.members?.[0];
        if (mine) {
          router.replace(mine.status === "ACTIVE" ? "/profile" : `/form?id=${mine.id}`);
          return;
        }
      }

      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setForm({
            ...parsed,
            phone: initialPhone || parsed.phone || "",
            village: parsed.village || HOME_VILLAGE,
            referenceCode: parsed.referenceCode || generateReferenceCode(),
          });
          setDraftRestored(true);
        } catch {
          setForm((p) => ({ ...p, phone: initialPhone, referenceCode: generateReferenceCode() }));
        }
      } else {
        setForm((p) => ({ ...p, phone: initialPhone, referenceCode: generateReferenceCode() }));
      }

      setCheckingAuth(false);
    }
    load();
  }, [router, editId]);

  useEffect(() => {
    if (checkingAuth || editId) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }, 300);
    return () => clearTimeout(timeout);
  }, [form, checkingAuth, editId]);

  function startOver() {
    setForm({
      fullName: "",
      phone: "",
      village: HOME_VILLAGE,
      age: "",
      paymentMethod: "",
      paidAmount: "",
      referenceCode: generateReferenceCode(),
    });
    localStorage.removeItem(DRAFT_KEY);
    setDraftRestored(false);
  }

  function handleVillageSelect(village: string) {
    setForm((p) => ({ ...p, village, age: requiresAgeGroup(village) ? p.age : "" }));
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  async function shareReferenceCode() {
    const text = `رقم دفتري في رابطة شباب قرية التاكلالت: ${form.referenceCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {}
    }
    copyCode(form.referenceCode);
  }

  function validateStep1(): string | null {
    if (!form.fullName.trim()) return memberMessages.fullNameRequired;
    if (!isArabicName(form.fullName)) return "الاسم الكامل يجب أن يكون بالحروف العربية فقط";
    const phoneError = validatePhone(form.phone);
    if (phoneError) return phoneError;
    if (!form.village) return villageMessages.pickVillage;
    if (requiresAgeGroup(form.village) && !form.age) return memberMessages.pickAgeGroup;
    return null;
  }

  function goBack() {
    setError("");
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function goNextFromStep1() {
    setError("");
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setStepIndex((i) => i + 1);
  }

  async function createAccount() {
    setError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(auth.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setAccountLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحساب");
      setAuthenticated(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const step1Error = validateStep1();
    if (step1Error) {
      setError(step1Error);
      return;
    }
    if (!form.paymentMethod) {
      setError("يرجى اختيار طريقة الدفع");
      return;
    }
    const paidAmountError = validatePaidAmount(form.paidAmount, membershipFee);
    if (paidAmountError) {
      setError(paidAmountError);
      return;
    }
    const nameChoiceError =
      surplus > 0
        ? validateDonorChoice(wantsName === null ? null : !wantsName, form.fullName)
        : null;
    if (nameChoiceError) {
      setError(nameChoiceError);
      return;
    }
    if (proofUploading) {
      setError("يرجى الانتظار حتى انتهاء رفع الصورة");
      return;
    }
    if (!proofFilename) {
      setError("يرجى إرفاق صورة الكابتير");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editId ? { id: editId } : {}),
          ...form,
          age: ageForVillage(form.village, form.age),
          paidAmount: Number(form.paidAmount),
          surplusAnonymous: surplus > 0 && wantsName === false,
          paymentProof: proofFilename,
          photo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الطلب");
      if (data.referenceCode && data.referenceCode !== form.referenceCode) {
        setForm((p) => ({ ...p, referenceCode: data.referenceCode }));
      }
      if (!editId) localStorage.removeItem(DRAFT_KEY);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleIdleTimeout() {
    await fetch("/api/auth/logout", { method: "POST" });
    goAfterAuthChange(router, "/login");
  }

  useInactivityLogout(IDLE_TIMEOUT_MS, handleIdleTimeout, authenticated && !checkingAuth);

  if (checkingAuth) {
    return (
      <div className="app-shell flex">
        <PageLoading />
      </div>
    );
  }

  if (submitted) {
    return (
      <SubmittedCard
        form={form}
        editing={!!editId}
        copied={copied}
        onCopy={copyCode}
        onShare={shareReferenceCode}
        onProfile={() => goAfterAuthChange(router, "/profile")}
      />
    );
  }

  return (
    <div className="app-shell">
      <div
        className="px-5 py-4 flex items-center gap-3 sticky top-0 z-20"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <BackButton href={cameFrom || (authenticated ? "/profile" : "/")} />
        <Image src="/version-final.png" alt="شعار" width={38} height={38} />
        <div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            رابطة شباب قرية التاكلالت
          </p>
          <h1 className="text-base font-black text-white">
            {editId ? "تعديل الطلب" : "استمارة الانضمام"}
          </h1>
        </div>
      </div>

      <div className="px-5 py-6 pb-10">
        {!editId && <ProgressBar stepIndex={stepIndex} total={steps.length} />}

        {draftRestored && !editId && currentStep === 1 && (
          <div
            className="rounded-2xl p-3 mb-4 fade-up flex items-center justify-between gap-3"
            style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--mint-700)" }}>
              <IconLabel name="save">تم استرجاع بياناتك المحفوظة من محاولة سابقة</IconLabel>
            </p>
            <button
              type="button"
              onClick={startOver}
              className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
              style={{
                background: "white",
                color: "var(--text-muted)",
                border: "1px solid var(--mint-200)",
              }}
            >
              البدء من جديد
            </button>
          </div>
        )}

        {currentStep === 1 && !editId && (
          <div
            className="rounded-2xl p-4 mb-4 fade-up text-center"
            style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
          >
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              <IconLabel name="trophy">
                الاشتراك في الرابطة هو ما يتيح لك المشاركة في الأنشطة والفعاليات
              </IconLabel>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              تريد فقط دعم الرابطة دون الانضمام كعضو؟{" "}
              <Link href="/donate" className="font-bold" style={{ color: "var(--mint-600)" }}>
                تبرّع من هنا
              </Link>
            </p>
          </div>
        )}

        {currentStep === 1 && (
          <StepIdentity
            form={form}
            setForm={setForm}
            authenticated={authenticated}
            villages={villages}
            ages={ages}
            onVillageSelect={handleVillageSelect}
            onAddAge={addAge}
            error={error}
            onNext={goNextFromStep1}
          />
        )}

        {currentStep === 2 && (
          <StepAccount
            phone={form.phone}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            error={error}
            loading={accountLoading}
            onBack={goBack}
            onCreate={createAccount}
          />
        )}

        {currentStep === 3 && (
          <StepPayment
            form={form}
            setForm={setForm}
            photo={photo}
            setPhoto={setPhoto}
            membershipFee={membershipFee}
            copied={copied}
            onCopy={copyCode}
            surplus={surplus}
            wantsName={wantsName}
            setWantsName={setWantsName}
            proofFilename={proofFilename}
            setProofFilename={setProofFilename}
            setProofUploading={setProofUploading}
            error={error}
            loading={loading}
            proofUploading={proofUploading}
            editing={!!editId}
            onBack={goBack}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
