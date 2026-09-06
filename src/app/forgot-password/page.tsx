"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";
import { forgotPassword as texts } from "@/lib/texts";

function buildWhatsappUrl(support: string, phone: string): string {
  const trimmed = phone.trim();
  const message = trimmed ? texts.askWithPhone(trimmed) : texts.ask;
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
      <PageHeader title={texts.title} backHref="/login" />

      <div className="flex-1 px-5 py-10 space-y-5">
        <div className="card p-5 fade-up">
          <p className="text-sm" style={{ color: "var(--text-main)" }}>
            {texts.explanation}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            {texts.temporaryNote}
          </p>
        </div>

        <div className="fade-up delay-1">
          <label
            htmlFor="forgot-phone"
            className="block text-sm font-bold mb-1.5"
            style={{ color: "var(--text-main)" }}
          >
            {texts.phoneLabel}
          </label>
          <input
            id="forgot-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
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
          {texts.whatsapp}
        </a>

        <div className="text-center fade-up delay-2 pt-2">
          <Link href="/login" className="text-xs font-bold" style={{ color: "var(--mint-600)" }}>
            <ArrowLabel>{texts.rememberedIt}</ArrowLabel>
          </Link>
        </div>
      </div>
    </div>
  );
}
