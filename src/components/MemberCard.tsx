"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { formatDate } from "@/lib/utils";
import IconLabel from "@/components/IconLabel";

interface MemberCardProps {
  fullName: string;
  age: string;
  memberNumber: string | null;
  verifyToken: string | null;
  createdAt: string;
  photo?: string | null;
}

type Busy = "image" | "pdf" | "share" | null;

export default function MemberCard({
  fullName,
  age,
  memberNumber,
  verifyToken,
  createdAt,
  photo,
}: MemberCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!verifyToken) return;
    const verifyUrl = `${window.location.origin}/verify/${verifyToken}`;
    QRCode.toDataURL(verifyUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#1a3f33", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [verifyToken]);

  // html2canvas-pro (not the plain html2canvas package — its Arabic/RTL
  // text shaping is unreliable) is loaded only here, on demand, never as
  // part of the page's own first-load bundle.
  async function renderCanvas() {
    if (!cardRef.current) return null;
    const { default: html2canvas } = await import("html2canvas-pro");
    return html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadImage() {
    setBusy("image");
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      downloadBlob(blob, `بطاقة-عضوية-${memberNumber}.png`);
    } catch (err) {
      console.error("Card image download error:", err);
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    setBusy("pdf");
    try {
      const [canvas, { jsPDF }] = await Promise.all([renderCanvas(), import("jspdf")]);
      if (!canvas) return;
      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`بطاقة-عضوية-${memberNumber}.pdf`);
    } catch (err) {
      console.error("Card PDF download error:", err);
    } finally {
      setBusy(null);
    }
  }

  async function shareCard() {
    setBusy("share");
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      const file = new File([blob], `بطاقة-عضوية-${memberNumber}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "بطاقة العضوية" });
        return;
      }
      if (navigator.share) {
        await navigator.share({
          title: "بطاقة العضوية",
          url: `${window.location.origin}/verify/${verifyToken}`,
        });
        return;
      }
      // No Web Share API on this browser — fall back to a direct download
      // rather than the button silently doing nothing.
      downloadBlob(blob, `بطاقة-عضوية-${memberNumber}.png`);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError")
        console.error("Card share error:", err);
    } finally {
      setBusy(null);
    }
  }

  if (!memberNumber) return null;

  return (
    <div className="card p-5 overflow-hidden">
      <h3
        className="font-bold mb-3 pb-2"
        style={{ color: "var(--text-main)", borderBottom: "1px solid var(--mint-100)" }}
      >
        <IconLabel name="idCard">بطاقة العضوية</IconLabel>
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
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              رابطة شباب قرية
            </p>
            <p className="text-sm font-black text-white">التاكلالت</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-xl p-2 shrink-0" style={{ background: "white" }}>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR Code" width={96} height={96} />
            ) : (
              <div className="w-24 h-24 animate-pulse" style={{ background: "var(--mint-100)" }} />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1" dir="rtl" style={{ textAlign: "right" }}>
            <div className="flex items-center gap-2 justify-end">
              <p className="font-black text-white" style={{ wordBreak: "break-word" }}>
                {fullName}
              </p>
              {photo && (
                <div
                  className="w-9 h-9 rounded-full overflow-hidden shrink-0"
                  style={{ border: "1.5px solid rgba(255,255,255,0.5)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/${photo}`}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <p className="text-xs" style={{ color: "#c5e8dc" }}>
              {age}
            </p>
            <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.7)" }} dir="ltr">
              {memberNumber}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
              عضو منذ {formatDate(createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={downloadImage}
          disabled={busy !== null}
          className="text-xs px-2 py-2 rounded-lg font-bold flex-1 disabled:opacity-40"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {busy === "image" ? "..." : <IconLabel name="download">صورة</IconLabel>}
        </button>
        <button
          onClick={downloadPdf}
          disabled={busy !== null}
          className="text-xs px-2 py-2 rounded-lg font-bold flex-1 disabled:opacity-40"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {busy === "pdf" ? "..." : <IconLabel name="file">PDF</IconLabel>}
        </button>
        <button
          onClick={shareCard}
          disabled={busy !== null}
          className="text-xs px-2 py-2 rounded-lg font-bold flex-1 disabled:opacity-40"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {busy === "share" ? "..." : <IconLabel name="upload">مشاركة</IconLabel>}
        </button>
      </div>

      <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
        امسح رمز QR للتحقق من صلاحية العضوية
      </p>
    </div>
  );
}
