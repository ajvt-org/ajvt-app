"use client";

import { useRef, useState } from "react";

interface ShareResultButtonProps {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  round: string | null;
  tournamentTitle: string;
}

export default function ShareResultButton({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  round,
  tournamentTitle,
}: ShareResultButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function download() {
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
      a.download = `${homeTeamName}-${awayTeamName}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Result image download error:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div
        ref={cardRef}
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, #265c49, #1a3f33)",
          position: "fixed",
          left: "-9999px",
          width: "320px",
        }}
      >
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>{tournamentTitle}{round ? ` — ${round}` : ""}</p>
        <div className="flex items-center justify-between gap-3" dir="rtl">
          <p className="font-black text-white text-sm flex-1 text-center" style={{ wordBreak: "break-word" }}>{homeTeamName}</p>
          <p className="font-black text-white text-2xl shrink-0">{homeScore} - {awayScore}</p>
          <p className="font-black text-white text-sm flex-1 text-center" style={{ wordBreak: "break-word" }}>{awayTeamName}</p>
        </div>
        <p className="text-xs mt-3 text-center" style={{ color: "rgba(255,255,255,0.6)" }}>رابطة شباب قرية التاكلالت</p>
      </div>

      <button
        onClick={download}
        disabled={downloading}
        className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        {downloading ? "..." : "📤 مشاركة النتيجة"}
      </button>
    </div>
  );
}
