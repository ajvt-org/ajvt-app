"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface MemberCardProps {
  fullName: string;
  age: string;
  memberNumber: string | null;
  createdAt: string;
}

export default function MemberCard({ fullName, age, memberNumber, createdAt }: MemberCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!memberNumber) return;
    const verifyUrl = `${window.location.origin}/verify/${memberNumber}`;
    QRCode.toDataURL(verifyUrl, { width: 220, margin: 1, color: { dark: "#1a3f33", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [memberNumber]);

  async function downloadCard() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `بطاقة-عضوية-${memberNumber}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Card download error:", err);
    } finally {
      setDownloading(false);
    }
  }

  if (!memberNumber) return null;

  return (
    <div className="card p-5 overflow-hidden">
      <h3 className="font-bold mb-3 pb-2" style={{ color: "var(--text-main)", borderBottom: "1px solid var(--mint-100)" }}>
        🪪 بطاقة العضوية
      </h3>

      <div
        ref={cardRef}
        className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, #265c49, #1a3f33)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/version-final.png" alt="شعار" width={36} height={36} />
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>رابطة شباب قرية</p>
            <p className="text-sm font-black text-white">التاكلالت</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="rounded-xl p-2 shrink-0"
            style={{ background: "white" }}
          >
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR Code" width={96} height={96} />
            ) : (
              <div className="w-24 h-24 animate-pulse" style={{ background: "var(--mint-100)" }} />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-black text-white truncate">{fullName}</p>
            <p className="text-xs" style={{ color: "#c5e8dc" }}>{age}</p>
            <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.7)" }} dir="ltr">
              {memberNumber}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
              عضو منذ {new Date(createdAt).toLocaleDateString("ar-MA", { year: "numeric", month: "long" })}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={downloadCard}
        disabled={downloading}
        className="text-xs px-3 py-2 rounded-lg font-bold w-full mt-3"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        {downloading ? "..." : "⬇️ تحميل البطاقة"}
      </button>

      <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
        امسح رمز QR للتحقق من صلاحية العضوية
      </p>
    </div>
  );
}
