import Link from "next/link";
import Logo from "@/components/Logo";
import { association } from "@/lib/texts";

export default function LandingHero() {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-8 text-center flex-1"
      style={{
        background:
          "linear-gradient(180deg, var(--mint-700) 0%, var(--mint-500) 55%, var(--mint-50) 100%)",
      }}
    >
      <h1 className="sr-only">{association.name}</h1>

      <div className="fade-up mb-4">
        <Logo mark="roundel" size={200} className="mx-auto" priority />
      </div>

      <p className="fade-up delay-2 text-sm mb-10" style={{ color: "rgba(255,255,255,0.75)" }}>
        موريتانيا 🇲🇷
      </p>

      <div
        className="fade-up delay-2 w-16 h-0.5 mx-auto mb-10 rounded-full"
        style={{ background: "rgba(255,255,255,0.35)" }}
      />

      <div className="fade-up delay-3 w-full max-w-xs space-y-3">
        <Link href="/register" className="btn btn-copper block">
          إنشاء حساب جديد
        </Link>
        <Link
          href="/login"
          className="btn block"
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            border: "1.5px solid rgba(255,255,255,0.4)",
          }}
        >
          تسجيل الدخول
        </Link>
      </div>

      <div className="fade-up delay-4 mt-6">
        <Link
          href="/admin/login"
          className="text-xs px-3 py-1.5 rounded-full"
          style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          دخول المشرف
        </Link>
      </div>
    </div>
  );
}
