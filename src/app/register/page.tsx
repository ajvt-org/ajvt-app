"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { validatePhone } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const phoneError = validatePhone(form.phone);
    if (phoneError) { setError(phoneError); return; }
    if (form.password !== form.confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (form.password.length < 3) {
      setError("كلمة المرور يجب أن تكون 3 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحساب");
      router.push("/form");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <Image src="/version-final.png" alt="شعار" width={40} height={40} />
        <div>
          <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
            رابطة شباب قرية التاكلالت
          </p>
          <h1 className="text-base font-black text-white">إنشاء حساب</h1>
        </div>
      </div>

      <div className="flex-1 px-5 py-8 space-y-5">
        <div className="flex justify-center mb-2 fade-up">
          <Image src="/version-final.png" alt="شعار" width={80} height={80} className="opacity-80" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 fade-up delay-1">
          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              رقم الهاتف
            </label>
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                setForm((p) => ({ ...p, phone: digits }));
              }}
              required
              placeholder="2XXXXXXX"
              dir="ltr"
              maxLength={8}
              className="input"
              style={{ letterSpacing: "0.15em" }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              8 أرقام — يبدأ بـ 2 أو 3 أو 4
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              كلمة المرور
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              تأكيد كلمة المرور
            </label>
            <input
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="input"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary mt-2">
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب ←"}
          </button>
        </form>

        <p className="text-center text-sm fade-up delay-2" style={{ color: "var(--text-muted)" }}>
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-bold" style={{ color: "var(--mint-600)" }}>
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
