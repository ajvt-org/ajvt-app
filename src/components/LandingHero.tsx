import Image from "next/image";
import Link from "next/link";

// The first thing a visitor sees: who the association is, and the two doors
// that have nowhere else to live. Support and the activities have their own
// tabs, so they are not repeated here.
export default function LandingHero() {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-8 text-center flex-1"
      style={{
        background:
          "linear-gradient(180deg, var(--mint-700) 0%, var(--mint-500) 55%, var(--mint-50) 100%)",
      }}
    >
      {/* Logo */}
      <div className="fade-up mb-6">
        <div
          className="w-40 h-40 rounded-full flex items-center justify-center mx-auto"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "3px solid rgba(255,255,255,0.45)",
            padding: "10px",
          }}
        >
          <Image
            src="/version-final.png"
            alt="شعار رابطة شباب قرية التاكلالت"
            width={112}
            height={112}
            priority
          />
        </div>
      </div>

      <div className="fade-up delay-1 mb-2">
        <h1
          className="text-2xl font-black leading-snug"
          style={{ color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,0.2)" }}
        >
          رابطة شباب قرية
        </h1>
        <h1
          className="text-3xl font-black"
          style={{ color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,0.2)" }}
        >
          التاكلالت
        </h1>
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
