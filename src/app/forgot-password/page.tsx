"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/lib/settings";

// No automated SMS/WhatsApp-API channel is wired up (both would mean a new
// paid external service) — recovery goes through an admin, who already has
// a reset tool in /admin/dashboard. This page is the member-facing half:
// it gets them to that admin with everything needed to act immediately,
// instead of leaving them with no path back into their account at all.
function buildWhatsappUrl(support: string, phone: string): string {
  const trimmed = phone.trim();
  const message = trimmed
    ? `السلام عليكم، نسيت كلمة مرور حسابي في تطبيق رابطة شباب قرية التاكلالت. رقم هاتفي المسجل في التطبيق: ${trimmed}`
    : "السلام عليكم، نسيت كلمة مرور حسابي في تطبيق رابطة شباب قرية التاكلالت وأحتاج مساعدة لاستعادتها.";
  return `https://wa.me/${support}?text=${encodeURIComponent(message)}`;
}

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");
  const [support, setSupport] = useState(DEFAULT_SETTINGS.supportWhatsapp);

  useEffect(() => {
    api
      .get<{ settings: { supportWhatsapp: string } }>("/api/settings")
      .then((d) => setSupport(d.settings.supportWhatsapp))
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <PageHeader title="استعادة كلمة المرور" backHref="/login" />

      <div className="flex-1 px-5 py-10 space-y-5">
        <div className="card p-5 fade-up">
          <p className="text-sm" style={{ color: "var(--text-main)" }}>
            لا يمكن استعادة كلمة المرور تلقائياً حالياً. تواصل معنا عبر واتساب وسيقوم أحد المشرفين
            بإعادة تعيينها لك خلال وقت قصير.
          </p>
        </div>

        <div className="fade-up delay-1">
          <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
            رقم هاتفك المسجل (اختياري — يسهّل التعرف على حسابك)
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="2XXXXXXX"
            dir="ltr"
            maxLength={8}
            className="input"
            style={{ letterSpacing: "0.15em" }}
          />
        </div>

        <a
          href={buildWhatsappUrl(support, phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp fade-up delay-1"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          تواصل معنا عبر واتساب
        </a>

        <div className="text-center fade-up delay-2 pt-2">
          <Link href="/login" className="text-xs font-bold" style={{ color: "var(--mint-600)" }}>
            ← تذكرت كلمة المرور؟ تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
