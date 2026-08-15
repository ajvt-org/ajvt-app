import Image from "next/image";
import Link from "next/link";

// The first thing a visitor sees: who the association is and the three ways
// in. Split out so the landing page is a list of sections rather than one
// long file, and so dropping it is an edit to LANDING_SECTIONS.
export default function LandingHero({ activityCount }: { activityCount: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{
        background:
          "linear-gradient(180deg, var(--mint-700) 0%, var(--mint-500) 55%, var(--mint-50) 100%)",
        minHeight: "100svh",
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
        <Link href="/form" className="btn btn-copper block">
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
        <Link
          href="/donate"
          className="btn block"
          style={{
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            border: "1.5px dashed rgba(255,255,255,0.5)",
          }}
        >
          💚 ادعم الرابطة (بدون حساب)
        </Link>
      </div>

      <Link
        href="/leaderboard"
        className="fade-up delay-3 mt-4 text-xs font-bold"
        style={{ color: "rgba(255,255,255,0.75)" }}
      >
        🏆 لوحة شرف المتبرعين
      </Link>

      <a
        href="#activities"
        className="fade-up delay-4 mt-10 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold"
        style={{
          background: "rgba(255,255,255,0.18)",
          color: "#fff",
          border: "1.5px solid rgba(255,255,255,0.4)",
        }}
      >
        {activityCount > 0
          ? `🏆 أنشطة هذا الصيف جارية الآن (${activityCount}) ⬇️`
          : "🧠 المسابقة الثقافية ⬇️"}
      </a>

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
