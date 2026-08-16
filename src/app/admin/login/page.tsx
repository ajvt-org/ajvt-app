"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { safeNextPath } from "@/lib/utils";
import { arabicValidity } from "@/lib/validationMessage";
import ArrowLabel from "@/components/ArrowLabel";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [creds, setCreds] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الدخول");
      router.push(safeNextPath(searchParams.get("next"), "/admin/dashboard"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "بيانات غير صحيحة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{
        background: "linear-gradient(160deg, var(--mint-800) 0%, var(--mint-600) 100%)",
        direction: "rtl",
      }}
    >
      <div className="w-full max-w-sm fade-up">
        <div className="text-center mb-8">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "2px solid rgba(255,255,255,0.35)",
              padding: "8px",
            }}
          >
            <Image src="/version-final.png" alt="شعار" width={80} height={80} />
          </div>
          <h1 className="text-xl font-black text-white mb-1">لوحة تحكم المشرف</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            رابطة شباب قرية التاكلالت
          </p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(16px)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-bold mb-1.5 text-white"
                htmlFor="adminlogin-field-1"
              >
                اسم المستخدم
              </label>
              <input
                id="adminlogin-field-1"
                type="text"
                value={creds.username}
                onChange={(e) => setCreds((p) => ({ ...p, username: e.target.value }))}
                required
                {...arabicValidity()}
                placeholder=""
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 font-semibold transition-all"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  fontFamily: "Tajawal, sans-serif",
                  fontSize: "1rem",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.6)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.2)")}
              />
            </div>
            <div>
              <label
                className="block text-sm font-bold mb-1.5 text-white"
                htmlFor="adminlogin-field-2"
              >
                كلمة المرور
              </label>
              <input
                id="adminlogin-field-2"
                type="password"
                value={creds.password}
                onChange={(e) => setCreds((p) => ({ ...p, password: e.target.value }))}
                required
                {...arabicValidity()}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  fontFamily: "Tajawal, sans-serif",
                  fontSize: "1rem",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.6)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.2)")}
              />
            </div>
            {error && (
              <div
                className="p-3 rounded-xl text-sm font-semibold"
                style={{
                  background: "rgba(239,68,68,0.2)",
                  color: "#fca5a5",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                ⚠️ {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn btn-copper">
              {loading ? "جاري التحقق..." : <ArrowLabel>دخول</ArrowLabel>}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-sm">
          <Link href="/" style={{ color: "rgba(255,255,255,0.5)" }}>
            <ArrowLabel direction="back">الصفحة الرئيسية</ArrowLabel>
          </Link>
        </p>
      </div>
    </div>
  );
}
