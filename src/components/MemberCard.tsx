"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { formatDate } from "@/lib/utils";
import IconLabel from "@/components/IconLabel";
import Logo from "@/components/Logo";
import { savePdf, savePng, sharePng } from "@/components/pdf/renderPdf";
import { memberCard } from "@/lib/texts";

interface MemberCardProps {
  fullName: string;
  village: string;
  age: string | null;
  memberNumber: string | null;
  verifyToken: string | null;
  createdAt: string;
  photo?: string | null;
}

type Busy = "image" | "pdf" | "share" | null;

export default function MemberCard({
  fullName,
  village,
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

  async function run(mode: Busy, action: (node: HTMLElement) => Promise<void>) {
    if (!cardRef.current) return;
    setBusy(mode);
    try {
      await action(cardRef.current);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") console.error("Card error:", err);
    } finally {
      setBusy(null);
    }
  }

  if (!memberNumber) return null;

  const fileName = (extension: string) => memberCard.fileName(memberNumber, extension);

  return (
    <div className="card p-5 overflow-hidden">
      <h3
        className="font-bold mb-3 pb-2"
        style={{ color: "var(--text-main)", borderBottom: "1px solid var(--mint-100)" }}
      >
        <IconLabel name="idCard">{memberCard.title}</IconLabel>
      </h3>

      <div
        ref={cardRef}
        className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, #265c49, #1a3f33)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Logo mark="symbol" size={36} captured />
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              {memberCard.association}
            </p>
            <p className="text-sm font-black text-white">{memberCard.village}</p>
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
              {[village, age].filter(Boolean).join(" · ")}
            </p>
            <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.7)" }} dir="ltr">
              {memberNumber}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
              {memberCard.memberSince(formatDate(createdAt))}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => run("image", (node) => savePng(node, fileName("png")))}
          disabled={busy !== null}
          className="text-xs px-2 py-2 rounded-lg font-bold flex-1 disabled:opacity-40"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {busy === "image" ? (
            memberCard.busy
          ) : (
            <IconLabel name="download">{memberCard.image}</IconLabel>
          )}
        </button>
        <button
          onClick={() => run("pdf", (node) => savePdf(node, fileName("pdf")))}
          disabled={busy !== null}
          className="text-xs px-2 py-2 rounded-lg font-bold flex-1 disabled:opacity-40"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {busy === "pdf" ? memberCard.busy : <IconLabel name="file">{memberCard.pdf}</IconLabel>}
        </button>
        <button
          onClick={() =>
            run("share", (node) =>
              sharePng(
                node,
                fileName("png"),
                memberCard.title,
                `${window.location.origin}/verify/${verifyToken}`,
              ),
            )
          }
          disabled={busy !== null}
          className="text-xs px-2 py-2 rounded-lg font-bold flex-1 disabled:opacity-40"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {busy === "share" ? (
            memberCard.busy
          ) : (
            <IconLabel name="upload">{memberCard.share}</IconLabel>
          )}
        </button>
      </div>
    </div>
  );
}
