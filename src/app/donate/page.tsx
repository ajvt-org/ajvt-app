"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PaymentInfoBanner from "@/components/PaymentInfoBanner";

export default function DonatePage() {
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      if (donorName.trim()) fd.append("donorName", donorName.trim());
      if (amount.trim()) fd.append("amount", amount.trim());

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

  if (done) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="card p-8 text-center max-w-sm mx-4 fade-up">
          <div className="text-5xl mb-4">❤️</div>
          <h1 className="text-lg font-black mb-2" style={{ color: "var(--text-main)" }}>شكراً لدعمك!</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            تم استلام تبرعك وسيتم مراجعته من طرف الرابطة. جزاك الله خيراً.
          </p>
          <Link href="/" className="btn btn-primary">العودة للصفحة الرئيسية</Link>
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
            يمكنك دعم الرابطة بأي مبلغ تختاره دون الحاجة لإنشاء حساب — هذا التبرع منفصل عن رسوم المشاركة في الأنشطة.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 fade-up delay-1">
          <PaymentInfoBanner />

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              المبلغ (اختياري)
            </label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="بالأوقية"
              className="input"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              اسمك (اختياري)
            </label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="فاعل خير"
              maxLength={50}
              className="input"
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              اتركه فارغاً لتبقى مجهولاً — سيظهر باسم &quot;فاعل خير&quot;
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
