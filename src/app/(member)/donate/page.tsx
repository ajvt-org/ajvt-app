"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PaymentInfoBanner from "@/components/PaymentInfoBanner";
import { ONLINE_PAYMENT_METHODS as PAYMENT_METHODS } from "@/lib/donations";
import PageHeader from "@/components/PageHeader";
import { arabicValidity } from "@/lib/validationMessage";
import { errorMessage } from "@/lib/api";
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

  // Arriving from /home carries the member in the URL. Arriving from the tab
  // bar carries nothing, so the session is asked instead — otherwise a
  // signed-in member is told they are about to donate without an account.
  // A donation belongs to the account, not to one of its members, and an
  // account has no name of its own; the first active member is the name it
  // goes under, which is what the leaderboard link already assumes.
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

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("amount", amount.trim());
      fd.append("paymentMethod", paymentMethod);
      if (lockedMember) {
        fd.append("memberId", lockedMember.id);
        if (wantsName === false) fd.append("anonymous", "true");
      } else if (donorName.trim()) {
        fd.append("donorName", donorName.trim());
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
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="card p-8 text-center max-w-sm mx-4 fade-up">
          <div className="mb-4 flex justify-center">
            <Icon name="heart" filled size={48} color="var(--mint-600)" />
          </div>
          <h1 className="text-lg font-black mb-2" style={{ color: "var(--text-main)" }}>
            شكراً لدعمك!
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            تم استلام تبرعك وسيتم مراجعته من طرف الرابطة. جزاك الله خيراً.
          </p>
          <Link href="/leaderboard" className="btn btn-primary">
            <IconLabel name="trophy">شاهد لوحة شرف المتبرعين</IconLabel>
          </Link>
        </div>
      </div>
    );
  }

  // Anonymous visitor (no account, not donating as a known ACTIVE member) —
  // make sure they know a donation isn't membership before they proceed:
  // no account, no membership card, no activities. Skipped entirely for a
  // signed-in ACTIVE member donating from /home (lockedMember already set).
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
          <Link
            href="/leaderboard"
            className="text-xs font-bold mt-2 inline-block"
            style={{ color: "var(--mint-600)" }}
          >
            <IconLabel name="trophy">شاهد لوحة شرف المتبرعين</IconLabel>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 fade-up delay-1">
          <PaymentInfoBanner />

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              المبلغ (MRU)<span style={{ color: "var(--copper-500)" }}>*</span>
            </label>
            <input
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
            <label className="block text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
              طريقة الدفع <span style={{ color: "var(--copper-500)" }}>*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
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

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
              هل تريد ذكر اسمك مع التبرع؟
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWantsName(true)}
                className="py-3 rounded-xl text-sm font-bold transition-all border-2"
                style={{
                  background: wantsName === true ? "var(--mint-600)" : "white",
                  color: wantsName === true ? "white" : "var(--mint-700)",
                  borderColor: wantsName === true ? "var(--mint-600)" : "var(--mint-200)",
                }}
              >
                <IconLabel name="pencil">
                  نعم{lockedMember ? ` — ${lockedMember.fullName}` : "، باسمي"}
                </IconLabel>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWantsName(false);
                  setDonorName("");
                }}
                className="py-3 rounded-xl text-sm font-bold transition-all border-2"
                style={{
                  background: wantsName === false ? "var(--mint-600)" : "white",
                  color: wantsName === false ? "white" : "var(--mint-700)",
                  borderColor: wantsName === false ? "var(--mint-600)" : "var(--mint-200)",
                }}
              >
                <IconLabel name="lock">أفضّل أن أبقى مجهولاً</IconLabel>
              </button>
            </div>

            {!lockedMember && wantsName === true && (
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="اكتب اسمك هنا"
                maxLength={50}
                className="input mt-2"
                autoFocus
              />
            )}

            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              {wantsName === false
                ? 'سيُسجَّل تبرعك باسم "فاعل خير" — لن يظهر في لوحة شرف المتبرعين، لكن سيُحتسب ضمن مجموع الدعم.'
                : wantsName === true
                  ? "سنذكر اسمك تقديراً لدعمك، وسيظهر في لوحة شرف المتبرعين."
                  : "كلا الخيارين متاحان بنفس القدر — لكن مشاركة اسمك تُدرجك في لوحة شرف المتبرعين."}
            </p>
          </div>

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
