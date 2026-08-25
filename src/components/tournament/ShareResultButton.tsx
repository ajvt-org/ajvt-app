"use client";

import { useRef, useState } from "react";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import MatchTeams from "@/components/tournament/matchCard/MatchTeams";
import IconLabel from "@/components/IconLabel";
import Icon from "@/components/Icon";
import CardChip from "@/components/tournament/CardChip";
import { matchDisplay } from "@/lib/texts";

interface GoalEntry {
  fullName: string;
  photo: string | null;
  count: number;
  minute: number | null;
  isHome: boolean;
}

interface BookingEntry {
  fullName: string;
  photo: string | null;
  cardType: "YELLOW" | "RED";
  minute: number | null;
  isHome: boolean;
}

interface ShareResultButtonProps {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeScore: number;
  awayScore: number;
  round: string | null;
  tournamentTitle: string;
  goals?: GoalEntry[];
  bookings?: BookingEntry[];
}

interface EventLine {
  icon: React.ReactNode;
  label: string;
  photo: string | null;
  minute: number | null;
}

function buildEvents(goals: GoalEntry[], bookings: BookingEntry[], isHome: boolean): EventLine[] {
  const lines: EventLine[] = [];
  for (const g of goals.filter((x) => x.isHome === isHome)) {
    for (let i = 0; i < Math.max(g.count, 1); i++) {
      lines.push({
        icon: <Icon name="ball" size={13} className="icon-inline" />,
        label: g.fullName,
        photo: g.photo,
        minute: i === 0 ? g.minute : null,
      });
    }
  }
  for (const b of bookings.filter((x) => x.isHome === isHome)) {
    lines.push({
      icon: <CardChip type={b.cardType as "YELLOW" | "RED"} />,
      label: b.fullName,
      photo: b.photo,
      minute: b.minute,
    });
  }
  return lines.sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
}

export default function ShareResultButton({
  homeTeamName,
  awayTeamName,
  homeTeamLogo = null,
  awayTeamLogo = null,
  homeScore,
  awayScore,
  round,
  tournamentTitle,
  goals = [],
  bookings = [],
}: ShareResultButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const homeEvents = buildEvents(goals, bookings, true);
  const awayEvents = buildEvents(goals, bookings, false);

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
          width: "340px",
        }}
      >
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>
          {tournamentTitle}
          {round ? ` — ${round}` : ""}
        </p>
        <MatchTeams
          home={{ name: homeTeamName, logo: homeTeamLogo }}
          away={{ name: awayTeamName, logo: awayTeamLogo }}
          score={{ home: homeScore, away: awayScore }}
          tone="dark"
          size="xl"
          layout="stacked"
        />

        {(homeEvents.length > 0 || awayEvents.length > 0) && (
          <div className="flex justify-between gap-3 mt-4" dir="rtl">
            <div className="flex-1 space-y-1.5">
              {homeEvents.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-1"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  <PlayerAvatar photo={ev.photo} fullName={ev.label} size={16} />
                  <span className="text-xs">
                    {ev.icon} {ev.label}
                    {ev.minute ? ` ${ev.minute}'` : ""}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex-1 space-y-1.5">
              {awayEvents.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-1"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  <PlayerAvatar photo={ev.photo} fullName={ev.label} size={16} />
                  <span className="text-xs">
                    {ev.icon} {ev.label}
                    {ev.minute ? ` ${ev.minute}'` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs mt-3 text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
          {matchDisplay.clubName}
        </p>
      </div>

      <button
        onClick={download}
        disabled={downloading}
        className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        {downloading ? "..." : <IconLabel name="upload">{matchDisplay.shareResult}</IconLabel>}
      </button>
    </div>
  );
}
