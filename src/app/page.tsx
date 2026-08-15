import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { toThumbUrl } from "@/lib/utils";
import ArrowLabel from "@/components/ArrowLabel";
import NumericRanges from "@/components/NumericRanges";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const activities = await prisma.activity.findMany({
    where: { isOpen: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      period: true,
      photo: true,
      capacity: true,
      isTournament: true,
      isVolunteer: true,
      whatsappLink: true,
      _count: { select: { registrations: { where: { status: { not: "REJECTED" } } } } },
    },
  });

  return (
    <div>
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
          {activities.length > 0
            ? `🏆 أنشطة هذا الصيف جارية الآن (${activities.length}) ⬇️`
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

      <div
        id="activities"
        className="px-5 py-8"
        style={{ background: "var(--mint-50)", scrollMarginTop: "1rem" }}
      >
        <h2 className="font-black text-lg mb-4 text-center" style={{ color: "var(--text-main)" }}>
          🏆 أنشطة هذا الصيف
        </h2>
        <div className="max-w-md mx-auto space-y-3">
          <div className="card overflow-hidden text-right">
            <div className="pt-4 flex justify-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
                style={{
                  background: "linear-gradient(160deg, var(--mint-500), var(--mint-700))",
                  border: "2px solid var(--mint-200)",
                }}
              >
                🧠
              </div>
            </div>
            <div className="p-4 text-center">
              <h3 className="font-bold" style={{ color: "var(--text-main)" }}>
                المسابقة الثقافية
              </h3>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                أسئلة يومية، نقاط، وترتيب بين المنتسبين 🔥 — متاحة للمنتسبين الذين أكملوا الانتساب
              </p>
              <Link href="/register" className="btn btn-primary mt-4">
                <ArrowLabel>أنشئ حساباً وأكمل استمارة الانضمام</ArrowLabel>
              </Link>
            </div>
          </div>

          {activities.map((activity) => (
            <div key={activity.id} className="card overflow-hidden text-right">
              {activity.photo && (
                <div className="pt-4 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={toThumbUrl(`/api/files/activity/${activity.photo}`)}
                    alt={activity.title}
                    width={96}
                    height={96}
                    loading="lazy"
                    decoding="async"
                    className="w-24 h-24 rounded-full object-cover"
                    style={{ border: "2px solid var(--mint-200)" }}
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-bold" style={{ color: "var(--text-main)" }}>
                    {activity.title}
                  </h3>
                  <span className="badge badge-open shrink-0 font-bold">
                    <span className="badge-dot" aria-hidden="true" />
                    {activity.isVolunteer ? "مفتوح للتطوع" : "مفتوح للتسجيل"}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  {activity.description}
                </p>
                <div
                  className="flex items-center gap-3 text-xs mt-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {activity.period && (
                    <span>
                      📅 <NumericRanges>{activity.period}</NumericRanges>
                    </span>
                  )}
                  {!activity.isVolunteer && activity.capacity !== null && (
                    <span>
                      👥 {activity._count.registrations}/{activity.capacity}
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {activity.isVolunteer ? (
                    <a
                      href={activity.whatsappLink || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp"
                      style={{ minHeight: "44px", padding: "0.65rem 1.25rem", fontSize: "0.9rem" }}
                    >
                      🤝 انضم كمتطوع الآن — واتساب
                    </a>
                  ) : (
                    <Link
                      href="/form"
                      className="btn btn-copper"
                      style={{ minHeight: "44px", padding: "0.65rem 1.25rem", fontSize: "0.9rem" }}
                    >
                      📝 سجّل الآن — أنشئ حسابك للمشاركة
                    </Link>
                  )}
                  {activity.isTournament && (
                    <Link
                      href={`/tournament/${activity.id}`}
                      className="text-xs px-4 py-2.5 rounded-xl font-bold inline-block"
                      style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                    >
                      <ArrowLabel>🏆 عرض الترتيب</ArrowLabel>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {activities.length > 0 && (
          <p className="text-xs text-center mt-5" style={{ color: "var(--text-muted)" }}>
            أنشئ حساباً وأكمل استمارة الانضمام للتسجيل في الأنشطة
          </p>
        )}
      </div>
    </div>
  );
}
