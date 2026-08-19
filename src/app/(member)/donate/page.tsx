"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PaymentInfoBanner from "@/components/PaymentInfoBanner";
import { ONLINE_PAYMENT_METHODS as PAYMENT_METHODS } from "@/lib/donations";
import PageHeader from "@/components/PageHeader";
import { arabicValidity } from "@/lib/validationMessage";
import { errorMessage } from "@/lib/api";
import { validateDonorChoice } from "@/lib/donorChoice";
import DonorNameChoice from "@/components/DonorNameChoice";
import DonateThanks from "./DonateThanks";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";

export default function DonatePage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <PageLoading />
        </div>
      }
    >
      <DonatePageInner />
    </Suspense>
  );
}

function DonatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get("memberId");

  const [lockedMember, setLockedMember] = useState<{ id: string; fullName: string } | null>(null);
  const [checkingMember, setCheckingMember] = useState(true);
  const [confirmedAnonymous, setConfirmedAnonymous] = useState(false);

  const [wantsName, setWantsName] = useState<boolean | null>(null);
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const lookup = memberId
      ? fetch(`/api/members/${memberId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) =>
            data && data.status === "ACTIVE" ? [{ id: data.id, fullName: data.fullName }] : [],
          )
      : fetch("/api/user/me")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) =>
            (data?.members ?? [])
              .filter((m: { status: string }) => m.status === "ACTIVE")
              .map((m: { id: string; fullName: string }) => ({ id: m.id, fullName: m.fullName })),
          );

    lookup
      .then((found: { id: string; fullName: string }[]) => {
        if (found.length > 0) {
          setLockedMember(found[0]);
          setWantsName(true);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingMember(false));
  }, [memberId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!selectedFile) {
      setError("يرجى إرفاق صورة إثبات الدفع");
      return;
    }
    const n = Number(amount);
    if (!amount.trim() || !Number.isInteger(n) || n <= 0) {
      setError("يرجى إدخال مبلغ التبرع");
      return;
    }
    if (!paymentMethod) {
      setError("يرجى اختيار طريقة الدفع");
      return;
    }
    const choiceError = validateDonorChoice(
      wantsName === null ? null : !wantsName,
      lockedMember ? lockedMember.fullName : donorName,
    );
    if (choiceError) {
      setError(choiceError);
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("amount", amount.trim());
      fd.append("paymentMethod", paymentMethod);
      if (lockedMember) {
        fd.append("memberId", lockedMember.id);
        if (wantsName === false) fd.append("anonymous", "true");
      } else {
        fd.append("anonymous", wantsName === false ? "true" : "false");
        if (wantsName === true) fd.append("donorName", donorName.trim());
      }

      const res = await fetch("/api/donations", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال التبرع");
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (checkingMember) {
    return (
      <div className="app-shell">
        <PageLoading />
      </div>
    );
  }

  if (done) {
    return <DonateThanks />;
  }

  if (!lockedMember && !confirmedAnonymous) {
    return (
      <div className="app-shell">
        <PageHeader title={"دعم الرابطة"} />

        <div className="px-5 py-6 pb-10 space-y-5">
          <div className="card p-5 fade-up">
            <div className="mb-2 flex justify-center">
              <Icon name="heart" filled size={32} color="var(--mint-600)" />
            </div>
            <p className="text-sm font-bold mb-2 text-center" style={{ color: "var(--text-main)" }}>
              أنت على وشك التبرع بدون إنشاء حساب
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              بدون حساب لن يكون لديك بطاقة عضوية رقمية، ولن تتمكن من المشاركة في أنشطة وفعاليات
              الرابطة — التبرع هنا يبقى دعماً عاماً منفصلاً عن العضوية.
            </p>
          </div>

          <div
            className="card p-5 fade-up delay-1"
            style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
          >
            <p className="text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              <Icon name="trophy" size={14} className="icon-inline" /> الاشتراك في الرابطة (100
              أوقية على الأقل) يتيح لك:
            </p>
            <ul className="text-sm space-y-1" style={{ color: "var(--text-muted)" }}>
              <li>• المشاركة في الأنشطة والفعاليات</li>
              <li>• بطاقة عضوية رقمية بمعرّف خاص بك</li>
              <li>• أي مبلغ زائد عن 100 يُحتسب تلقائياً كتبرّع باسمك</li>
            </ul>
          </div>

          <div className="space-y-2.5 fade-up delay-2">
            <button onClick={() => router.push("/form")} className="btn btn-primary">
              <IconLabel name="user">إنشاء حساب والانضمام للرابطة</IconLabel>
            </button>
            <button
              onClick={() => setConfirmedAnonymous(true)}
              className="btn"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              <IconLabel name="heart" filled>
                المتابعة والتبرع بدون حساب
              </IconLabel>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <PageHeader title={"دعم الرابطة"} />

      <div className="px-5 py-6 pb-10 space-y-5">
        <div className="card p-5 text-center fade-up">
          <div className="mb-2 flex justify-center">
            <Icon name="heart" filled size={32} color="var(--mint-600)" />
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {lockedMember
              ? "تبرعك منفصل عن رسوم العضوية، ويمكنك دعم الرابطة في أي وقت."
              : "تتابع الآن كمتبرع بدون حساب — هذا التبرع منفصل عن رسوم المشاركة في الأنشطة."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 fade-up delay-1">
          <PaymentInfoBanner />

          <div>
            <label
              htmlFor="donate-amount"
              className="block text-sm font-bold mb-1.5"
              style={{ color: "var(--text-main)" }}
            >
              المبلغ (MRU)<span style={{ color: "var(--copper-500)" }}>*</span>
            </label>
            <input
              id="donate-amount"
              type="number"
              min={1}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="بالأوقية"
              required
              {...arabicValidity()}
              className="input"
              dir="ltr"
            />
          </div>

          <div>
            <p
              id="donate-method-label"
              className="block text-sm font-bold mb-2"
              style={{ color: "var(--text-main)" }}
            >
              طريقة الدفع <span style={{ color: "var(--copper-500)" }}>*</span>
            </p>
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-labelledby="donate-method-label"
            >
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === method}
                  onClick={() => setPaymentMethod(method)}
                  className="py-3 rounded-xl text-sm font-bold transition-all border-2"
                  style={{
                    background: paymentMethod === method ? "var(--mint-600)" : "white",
                    color: paymentMethod === method ? "white" : "var(--mint-700)",
                    borderColor: paymentMethod === method ? "var(--mint-600)" : "var(--mint-200)",
                  }}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <DonorNameChoice
            wantsName={wantsName}
            onPick={(wants) => {
              setWantsName(wants);
              if (!wants) setDonorName("");
            }}
            donorName={donorName}
            onDonorName={setDonorName}
            memberName={lockedMember?.fullName}
          />

          <div>
            <p className="text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              صورة إثبات الدفع <span style={{ color: "var(--copper-500)" }}>*</span>
            </p>
            <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
              {previewUrl ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="إثبات الدفع"
                    className="max-h-48 mx-auto rounded-xl object-contain"
                  />
                  <p className="mt-2 text-xs text-center" style={{ color: "var(--mint-600)" }}>
                    انقر لتغيير الصورة
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-2 flex justify-center" style={{ color: "var(--mint-500)" }}>
                    <Icon name="receipt" size={36} />
                  </div>
                  <p className="font-bold text-sm" style={{ color: "var(--mint-700)" }}>
                    انقر لاختيار صورة من هاتفك
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    PNG / JPG — حجم أقصى 5 ميغابايت
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {error && (
            <div
              className="p-4 rounded-xl text-sm font-semibold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <Icon name="warning" size={14} className="icon-inline" /> {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? (
              "جاري الإرسال..."
            ) : (
              <IconLabel name="heart" filled>
                تأكيد الدعم
              </IconLabel>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
