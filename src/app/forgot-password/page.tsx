"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";

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
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            ستصلك كلمة مرور مؤقتة صالحة لمدة محدودة، وسيُطلب منك اختيار كلمة مرور خاصة بك عند أول
            دخول.
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
          <Icon name="whatsapp" />
          تواصل معنا عبر واتساب
        </a>

        <div className="text-center fade-up delay-2 pt-2">
          <Link href="/login" className="text-xs font-bold" style={{ color: "var(--mint-600)" }}>
            <ArrowLabel direction="back">تذكرت كلمة المرور؟ تسجيل الدخول</ArrowLabel>
          </Link>
        </div>
      </div>
    </div>
  );
}
