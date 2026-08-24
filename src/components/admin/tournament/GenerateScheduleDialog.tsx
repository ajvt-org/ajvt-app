"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import DialogHeader from "@/components/DialogHeader";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export default function GenerateScheduleDialog({
  activityId,
  onDone,
  onClose,
}: {
  activityId: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const showToast = useToast();
  const [perTeam, setPerTeam] = useState("3");
  const [times, setTimes] = useState(["16:00", "17:00"]);
  const [venue, setVenue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setError("");
    setBusy(true);
    try {
      const result = await api.post<{ created: number; scheduled: boolean }>(
        `/api/admin/activities/${activityId}/matches/generate`,
        {
          perTeam: Number(perTeam) || 3,
          times: times.filter(Boolean),
          venue: venue.trim() || null,
        },
      );
      showToast(
        result.scheduled
          ? "أُنشئ الجدول ووُزّعت المباريات على الأيام"
          : "أُنشئت المباريات بلا مواعيد — حدد تاريخ البداية لتوزيعها على الأيام",
      );
      onDone();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <DialogHeader title="توليد جدول المباريات" onClose={onClose} />
        <div className="p-4 space-y-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            تُقترح المباريات الناقصة لكل مجموعة، وتُوزّع كل جولة على يوم من أيام البطولة بالأوقات
            أدناه.
          </p>

          <div>
            <label htmlFor="gen-per-team" className="block text-sm font-bold mb-1.5">
              عدد المباريات لكل فريق
            </label>
            <input
              id="gen-per-team"
              type="number"
              min={1}
              max={10}
              value={perTeam}
              onChange={(e) => setPerTeam(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <p className="block text-sm font-bold mb-1.5">أوقات المباريات في اليوم</p>
            <div className="space-y-1.5">
              {times.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) =>
                      setTimes((p) => p.map((t, i) => (i === index ? e.target.value : t)))
                    }
                    aria-label={`وقت المباراة ${index + 1}`}
                    className="input input-sm"
                    style={{ width: "auto" }}
                  />
                  {times.length > 1 && (
                    <button
                      onClick={() => setTimes((p) => p.filter((_, i) => i !== index))}
                      aria-label="إزالة هذا الوقت"
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "#fee2e2", color: "#991b1b" }}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {times.length < 6 && (
              <button
                onClick={() => setTimes((p) => [...p, "18:00"])}
                className="text-xs font-bold mt-1.5"
                style={{ color: "var(--mint-700)" }}
              >
                <IconLabel name="plus">إضافة وقت</IconLabel>
              </button>
            )}
          </div>

          <div>
            <label htmlFor="gen-venue" className="block text-sm font-bold mb-1.5">
              الملعب
            </label>
            <input
              id="gen-venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              maxLength={60}
              placeholder="اختياري"
              className="input"
            />
          </div>

          {error && (
            <p
              className="p-3 rounded-xl text-sm font-semibold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <IconLabel name="warning">{error}</IconLabel>
            </p>
          )}

          <button onClick={generate} disabled={busy} className="btn btn-primary text-sm">
            {busy ? "..." : <IconLabel name="dice">توليد الجدول</IconLabel>}
          </button>
        </div>
      </div>
    </div>
  );
}
