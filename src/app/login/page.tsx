"use client";

import { Suspense, useState } from "react";
import IconLabel from "@/components/IconLabel";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { safeNextPath } from "@/lib/utils";
import { backFromNext } from "@/lib/authPaths";
import { arabicValidity } from "@/lib/validationMessage";
import ArrowLabel from "@/components/ArrowLabel";
import PageHeader from "@/components/PageHeader";
import Logo from "@/components/Logo";
import { goAfterAuthChange } from "@/lib/authNav";

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
      goAfterAuthChange(router, safeNextPath(searchParams.get("next"), "/home"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "بيانات غير صحيحة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <PageHeader title="تسجيل الدخول" backHref={backFromNext(searchParams.get("next"), "/")} />

      <div className="flex-1 px-5 py-10 space-y-5">
        <div className="flex justify-center fade-up mb-4">
          <Logo size={100} priority />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 fade-up delay-1">
          <div>
            <label
              htmlFor="login-phone"
              className="block text-sm font-bold mb-1.5"
              style={{ color: "var(--text-main)" }}
            >
              رقم الهاتف
            </label>
            <input
              id="login-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
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
            <label
              htmlFor="login-password"
              className="block text-sm font-bold mb-1.5"
              style={{ color: "var(--text-main)" }}
            >
              كلمة المرور
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
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
              <IconLabel name="warning">{error}</IconLabel>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary mt-2">
            {loading ? "جاري التحقق..." : <ArrowLabel>دخول</ArrowLabel>}
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
          <Link href="/register" className="font-bold" style={{ color: "var(--mint-600)" }}>
            إنشاء حساب
          </Link>
        </p>
      </div>
    </div>
  );
}
