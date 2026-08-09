"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import MemberCard from "@/components/MemberCard";
import NotificationsButton from "@/components/NotificationsButton";

type Status = "PENDING" | "ACTIVE" | "REJECTED";

interface MemberData {
  fullName: string;
  phone: string;
  age: string;
  paymentMethod: string;
  status: Status;
  createdAt: string;
  memberNumber: string | null;
}

export default function HomePage() {
  const router = useRouter();
  const [member, setMember] = useState<MemberData | null>(null);
  const [hasMember, setHasMember] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setHasMember(!!data.member);
        setMember(data.member || null);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center" style={{ color: "var(--mint-500)" }}>
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <p className="text-sm font-semibold">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const whatsappLink = process.env.NEXT_PUBLIC_WHATSAPP_LINK || "https://chat.whatsapp.com/XXXXX";

  return (
    <div className="app-shell">
      {/* Top bar */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <div className="flex items-center gap-3">
          <Image src="/version-final.png" alt="شعار" width={38} height={38} />
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>رابطة شباب قرية</p>
            <p className="text-sm font-black text-white">التاكلالت</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
        >
          خروج
        </button>
      </div>

      <div className="flex-1 px-5 py-6 space-y-5">
        {/* No form submitted yet */}
        {hasMember === false && (
          <div className="fade-up space-y-5">
            <div className="card p-6 text-center">
              <div className="text-4xl mb-3">📋</div>
              <h2 className="text-lg font-black mb-2" style={{ color: "var(--text-main)" }}>
                لم تقدم طلب انضمام بعد
              </h2>
              <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
                أكمل استمارة الانضمام للانضمام إلى رابطة شباب قرية التاكلالت
              </p>
              <button onClick={() => router.push("/form")} className="btn btn-primary">
                تعبئة استمارة الانضمام ←
              </button>
            </div>
          </div>
        )}

        {/* Member status */}
        {member && (
          <div className="fade-up space-y-4">
            <StatusCard status={member.status} whatsappLink={whatsappLink} />

            {member.status === "PENDING" && (
              <>
                <NotificationsButton />
                <div className="card p-4 fade-up delay-1 flex items-center justify-between gap-3">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    لاحظت خطأ في بياناتك؟
                  </p>
                  <button
                    onClick={() => router.push("/form")}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
                    style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                  >
                    تعديل الطلب
                  </button>
                </div>
              </>
            )}

            {member.status === "REJECTED" && (
              <div className="card p-5 fade-up delay-1 text-center">
                <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                  يمكنك تصحيح بياناتك وإعادة تقديم الطلب
                </p>
                <button onClick={() => router.push("/form")} className="btn btn-primary">
                  إعادة تقديم الطلب ←
                </button>
              </div>
            )}

            {/* Membership card with QR code */}
            {member.status === "ACTIVE" && (
              <div className="fade-up delay-1">
                <MemberCard
                  fullName={member.fullName}
                  age={member.age}
                  memberNumber={member.memberNumber}
                  createdAt={member.createdAt}
                />
              </div>
            )}

            {/* WhatsApp link if active */}
            {member.status === "ACTIVE" && (
              <div className="card p-5 fade-up delay-1">
                <h3 className="font-bold mb-3" style={{ color: "var(--text-main)" }}>
                  🎉 انضم إلى مجموعة الواتساب
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  تم قبول عضويتك. انقر أدناه للانضمام إلى مجموعة الواتساب الرسمية.
                </p>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  انضم إلى المجموعة
                </a>
              </div>
            )}

            {/* Member info summary */}
            <div className="card p-5 fade-up delay-2">
              <h3 className="font-bold mb-3 pb-2" style={{ color: "var(--text-main)", borderBottom: "1px solid var(--mint-100)" }}>
                بيانات الطلب
              </h3>
              <div className="space-y-2.5">
                <InfoRow label="الاسم الكامل" value={member.fullName} />
                <InfoRow label="رقم الهاتف" value={member.phone} dir="ltr" />
                <InfoRow label="العصر" value={member.age} />
                <InfoRow label="طريقة الدفع" value={member.paymentMethod} />
                <InfoRow
                  label="تاريخ الطلب"
                  value={new Date(member.createdAt).toLocaleDateString("ar", {
                    year: "numeric", month: "long", day: "numeric"
                  })}
                />
                <InfoRow
                  label="وقت الطلب"
                  value={new Date(member.createdAt).toLocaleTimeString("ar", {
                    hour: "2-digit", minute: "2-digit"
                  })}
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({ status, whatsappLink }: { status: Status; whatsappLink: string }) {
  void whatsappLink;
  const configs = {
    PENDING: {
      icon: "⏳",
      label: "قيد الانتظار",
      title: "طلبك قيد المراجعة",
      desc: "تم استلام طلبك. سيقوم المشرف بمراجعة بياناتك وإثبات الدفع وإعلامك بالنتيجة قريباً.",
      bg: "#fef9ee",
      border: "#fcd34d",
      badgeClass: "badge-pending",
      iconBg: "#fef3c7",
    },
    ACTIVE: {
      icon: "✅",
      label: "مقبول",
      title: "تم قبول عضويتك!",
      desc: "تهانينا! أنت الآن عضو رسمي في رابطة شباب قرية التاكلالت.",
      bg: "#f0fdf4",
      border: "#86efac",
      badgeClass: "badge-active",
      iconBg: "#d1fae5",
    },
    REJECTED: {
      icon: "❌",
      label: "غير مقبول",
      title: "لم يتم قبول طلبك",
      desc: "نأسف لإعلامك أنه لم يتم قبول طلبك. يمكنك التواصل مع المشرف لمزيد من المعلومات.",
      bg: "#fff5f5",
      border: "#fca5a5",
      badgeClass: "badge-rejected",
      iconBg: "#fee2e2",
    },
  };

  const cfg = configs[status];

  return (
    <div className="card p-5" style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 pulse"
          style={{ background: cfg.iconBg }}
        >
          {cfg.icon}
        </div>
        <div className="flex-1">
          <h2 className="font-black text-base mb-1" style={{ color: "var(--text-main)" }}>
            {cfg.title}
          </h2>
          <span className={`badge ${cfg.badgeClass} mb-2`}>{cfg.label}</span>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>{cfg.desc}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "var(--text-main)" }} dir={dir}>{value}</span>
    </div>
  );
}
