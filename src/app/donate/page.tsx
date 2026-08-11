"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PaymentInfoBanner from "@/components/PaymentInfoBanner";

export default function DonatePage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell flex items-center justify-center">
          <div className="text-3xl animate-pulse">⏳</div>
        </div>
      }
    >
      <DonatePageInner />
    </Suspense>
  );
}

function DonatePageInner() {
  const searchParams = useSearchParams();
  const memberId = searchParams.get("memberId");

  const [lockedMember, setLockedMember] = useState<{ id: string; fullName: string } | null>(null);
  const [checkingMember, setCheckingMember] = useState(!!memberId);

  const [wantsName, setWantsName] = useState<boolean | null>(null);
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!memberId) return;
    fetch(`/api/members/${memberId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.status === "ACTIVE") {
          setLockedMember({ id: data.id, fullName: data.fullName });
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedFile) { setError("يرجى إرفاق صورة إثبات الدفع"); return; }
    const n = Number(amount);
    if (!amount.trim() || !Number.isInteger(n) || n <= 0) {
      setError("يرجى إدخال مبلغ التبرع");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("amount", amount.trim());
      if (lockedMember) {
        fd.append("memberId", lockedMember.id);
      } else if (donorName.trim()) {
        fd.append("donorName", donorName.trim());
      }

      const res = await fetch("/api/donations", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال التبرع");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  if (checkingMember) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-3xl animate-pulse">⏳</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="card p-8 text-center max-w-sm mx-4 fade-up">
          <div className="text-5xl mb-4">❤️</div>
          <h1 className="text-lg font-black mb-2" style={{ color: "var(--text-main)" }}>شكراً لدعمك!</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            تم استلام تبرعك وسيتم مراجعته من طرف الرابطة. جزاك الله خيراً.
          </p>
          <Link href="/leaderboard" className="btn btn-primary">🏆 شاهد لوحة شرف المتبرعين</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <Image src="/version-final.png" alt="شعار" width={38} height={38} />
        <div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>رابطة شباب قرية التاكلالت</p>
          <h1 className="text-base font-black text-white">دعم الرابطة</h1>
        </div>
      </div>

      <div className="px-5 py-6 pb-10 space-y-5">
        <div className="card p-5 text-center fade-up">
          <div className="text-3xl mb-2">💚</div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {lockedMember
              ? "تبرعك منفصل عن رسوم العضوية، ويمكنك دعم الرابطة في أي وقت."
              : "يمكنك دعم الرابطة بأي مبلغ تختاره دون الحاجة لإنشاء حساب — هذا التبرع منفصل عن رسوم المشاركة في الأنشطة."}
          </p>
          <Link href="/leaderboard" className="text-xs font-bold mt-2 inline-block" style={{ color: "var(--mint-600)" }}>
            🏆 شاهد لوحة شرف المتبرعين
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 fade-up delay-1">
          <PaymentInfoBanner />

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              المبلغ <span style={{ color: "var(--copper-500)" }}>*</span>
            </label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="بالأوقية"
              required
              className="input"
              dir="ltr"
            />
          </div>

          {lockedMember ? (
            <div className="card p-4 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>سيُسجَّل التبرع باسم</span>
              <span className="text-sm font-black" style={{ color: "var(--mint-700)" }}>{lockedMember.fullName}</span>
            </div>
          ) : (
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
                  ✍️ نعم، باسمي
                </button>
                <button
                  type="button"
                  onClick={() => { setWantsName(false); setDonorName(""); }}
                  className="py-3 rounded-xl text-sm font-bold transition-all border-2"
                  style={{
                    background: wantsName === false ? "var(--mint-600)" : "white",
                    color: wantsName === false ? "white" : "var(--mint-700)",
                    borderColor: wantsName === false ? "var(--mint-600)" : "var(--mint-200)",
                  }}
                >
                  🤍 أفضّل أن أبقى مجهولاً
                </button>
              </div>

              {wantsName === true && (
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
                  ? "سيُسجَّل تبرعك باسم \"فاعل خير\" — لن يظهر في 🏆 لوحة شرف المتبرعين، لكن سيُحتسب ضمن مجموع الدعم."
                  : wantsName === true
                  ? "سنذكر اسمك تقديراً لدعمك، وسيظهر في 🏆 لوحة شرف المتبرعين."
                  : "كلا الخيارين متاحان بنفس القدر — لكن مشاركة اسمك تُدرجك في 🏆 لوحة شرف المتبرعين."}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              صورة إثبات الدفع <span style={{ color: "var(--copper-500)" }}>*</span>
            </p>
            <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
              {previewUrl ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="إثبات الدفع" className="max-h-48 mx-auto rounded-xl object-contain" />
                  <p className="mt-2 text-xs text-center" style={{ color: "var(--mint-600)" }}>انقر لتغيير الصورة</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-2">🧾</div>
                  <p className="font-bold text-sm" style={{ color: "var(--mint-700)" }}>انقر لاختيار صورة من هاتفك</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>PNG / JPG — حجم أقصى 5 ميغابايت</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            </label>
          </div>

          {error && (
            <div className="p-4 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "جاري الإرسال..." : "💚 تأكيد الدعم"}
          </button>
        </form>
      </div>
    </div>
  );
}
