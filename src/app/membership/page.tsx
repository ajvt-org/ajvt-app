"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginPathWithNext, safeNextPath } from "@/lib/utils";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import { generateReferenceCode } from "@/lib/referenceCode";
import { MEMBERSHIP_FEE, validatePaidAmount } from "@/lib/donations";
import { surplusOf } from "@/lib/membershipSurplus";
import { validateDonorChoice } from "@/lib/donorChoice";
import { api, errorMessage } from "@/lib/api";
import { members } from "@/lib/messages";
import IconLabel from "@/components/IconLabel";
import PageHeader from "@/components/PageHeader";
import { pageTitles } from "@/lib/texts";
import { goAfterAuthChange } from "@/lib/authNav";
import PageLoading from "@/components/PageLoading";
import StepPayment from "./StepPayment";
import SubmittedCard from "./SubmittedCard";
import { DRAFT_KEY, IDLE_TIMEOUT_MS } from "./constants";

export default function MembershipPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell flex">
          <PageLoading />
        </div>
      }
    >
      <MembershipPageInner />
    </Suspense>
  );
}

function MembershipPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const cameFrom = safeNextPath(searchParams.get("from"), "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [proofFilename, setProofFilename] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [membershipFee, setMembershipFee] = useState(MEMBERSHIP_FEE);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [wantsName, setWantsName] = useState<boolean | null>(null);

  const [form, setForm] = useState({
    paymentMethod: "",
    accountId: "",
    bankReference: "",
    paidAmount: "",
    referenceCode: "",
  });

  const surplus = surplusOf(form.paidAmount, membershipFee);

  useEffect(() => {
    api
      .get<{ settings: { membershipFee: number } }>("/api/settings")
      .then((d) => setMembershipFee(d.settings.membershipFee))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/user/me");
      if (meRes.status === 401) {
        router.push(loginPathWithNext("/login"));
        return;
      }
      const me = await meRes.json();
      setFullName(me?.fullName ?? "");

      const mine = me?.members?.[0];
      if (!editId && mine) {
        router.replace(mine.status === "ACTIVE" ? "/profile" : `/membership?id=${mine.id}`);
        return;
      }

      if (editId) {
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
          paymentMethod: member.paymentMethod || "",
          accountId: member.accountId || "",
          bankReference: member.bankReference || "",
          paidAmount:
            member.paidAmount != null
              ? String(member.paidAmount + (member.supportAmount ?? 0))
              : "",
          referenceCode: member.referenceCode || generateReferenceCode(),
        });
        if (member.surplusAnonymous) setWantsName(false);
        if (member.paymentProof) setProofFilename(member.paymentProof);
        setChecking(false);
        return;
      }

      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setForm({ ...parsed, referenceCode: parsed.referenceCode || generateReferenceCode() });
        } catch {
          setForm((p) => ({ ...p, referenceCode: generateReferenceCode() }));
        }
      } else {
        setForm((p) => ({ ...p, referenceCode: generateReferenceCode() }));
      }
      setChecking(false);
    }
    load();
  }, [router, editId]);

  useEffect(() => {
    if (checking || editId) return;
    const timeout = setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(form)), 300);
    return () => clearTimeout(timeout);
  }, [form, checking, editId]);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
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

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!form.paymentMethod) return setError(members.pickPaymentMethod);
    const paidAmountError = validatePaidAmount(form.paidAmount, membershipFee);
    if (paidAmountError) return setError(paidAmountError);
    const nameChoiceError =
      surplus > 0 ? validateDonorChoice(wantsName === null ? null : !wantsName, fullName) : null;
    if (nameChoiceError) return setError(nameChoiceError);
    if (proofUploading) return setError(members.waitForUpload);
    if (!proofFilename) return setError(members.attachProof);

    setLoading(true);
    try {
      const data = await api.post<{ referenceCode?: string }>("/api/members", {
        ...(editId ? { id: editId } : {}),
        ...form,
        accountId: form.accountId || null,
        bankReference: form.bankReference.trim() || null,
        paidAmount: Number(form.paidAmount),
        surplusAnonymous: surplus > 0 && wantsName === false,
        paymentProof: proofFilename,
      });
      if (data.referenceCode && data.referenceCode !== form.referenceCode) {
        setForm((p) => ({ ...p, referenceCode: data.referenceCode as string }));
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

  useInactivityLogout(IDLE_TIMEOUT_MS, handleIdleTimeout, !checking);

  if (checking) {
    return (
      <div className="app-shell flex">
        <PageLoading />
      </div>
    );
  }

  if (submitted) {
    return (
      <SubmittedCard
        form={{ ...form, fullName }}
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
      <PageHeader
        title={editId ? pageTitles.membershipEdit : pageTitles.membership}
        backHref={cameFrom || "/home"}
      />

      <div className="px-5 py-6 pb-10">
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

        <StepPayment
          form={form}
          setForm={setForm}
          fullName={fullName}
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
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
