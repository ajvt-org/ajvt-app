"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { safeNextPath } from "@/lib/utils";
import { arabicValidity } from "@/lib/validationMessage";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الدخول");
      router.push(safeNextPath(searchParams.get("next"), "/home"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "بيانات غير صحيحة");
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
          <h1 className="text-base font-black text-white">تسجيل الدخول</h1>
        </div>
      </div>

      <div className="flex-1 px-5 py-10 space-y-5">
        <div className="flex justify-center fade-up mb-4">
          <Image src="/version-final.png" alt="شعار" width={100} height={100} />
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
              {...arabicValidity()}
              placeholder="2XXXXXXX"
              dir="ltr"
              maxLength={8}
              className="input"
              style={{ letterSpacing: "0.15em" }}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
              كلمة المرور
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              {...arabicValidity()}
              placeholder="••••••••"
              className="input"
            />
          </div>

          {error && (
            <div
              className="p-3 rounded-xl text-sm font-semibold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary mt-2">
            {loading ? "جاري التحقق..." : "دخول ←"}
          </button>

          <Link
            href="/forgot-password"
            className="block text-center text-xs font-bold"
            style={{ color: "var(--mint-600)" }}
          >
            نسيت كلمة المرور؟
          </Link>
        </form>

        <p className="text-center text-sm fade-up delay-2" style={{ color: "var(--text-muted)" }}>
          ليس لديك حساب؟{" "}
          <Link href="/form" className="font-bold" style={{ color: "var(--mint-600)" }}>
            إنشاء حساب
          </Link>
        </p>

        <div className="text-center fade-up delay-3 pt-2">
          <Link href="/" className="text-xs" style={{ color: "var(--text-muted)" }}>
            ← الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
