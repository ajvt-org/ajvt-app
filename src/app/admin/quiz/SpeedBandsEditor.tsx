"use client";

import Icon from "@/components/Icon";
import type { SpeedBand } from "@/lib/competitionConfig";

export default function SpeedBandsEditor({
  bands,
  disabled,
  onChange,
}: {
  bands: SpeedBand[];
  disabled: boolean;
  onChange: (bands: SpeedBand[]) => void;
}) {
  function edit(index: number, patch: Partial<SpeedBand>) {
    onChange(bands.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function addBand() {
    const last = bands[bands.length - 1];
    const previous = bands[bands.length - 2];
    const seconds = previous?.maxSeconds ? previous.maxSeconds * 2 : 30;
    onChange([
      ...bands.slice(0, -1),
      { maxSeconds: seconds, percent: Math.max(0, last.percent + 10) },
      last,
    ]);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        شرائح السرعة
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        الإجابة الصحيحة داخل الشريحة تمنح النسبة المقابلة من نقاط السؤال.
      </p>

      {bands.map((band, i) => (
        <div key={i} className="flex items-center gap-2">
          {band.maxSeconds === null ? (
            <span className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>
              ما بعد ذلك
            </span>
          ) : (
            <>
              <label htmlFor={`band-seconds-${i}`} className="sr-only">
                حد الشريحة بالثواني
              </label>
              <input
                id={`band-seconds-${i}`}
                type="number"
                min={1}
                dir="ltr"
                value={band.maxSeconds}
                disabled={disabled}
                onChange={(e) => edit(i, { maxSeconds: Number(e.target.value) })}
                className="input input-sm flex-1"
              />
              <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                ثانية
              </span>
            </>
          )}
          <label htmlFor={`band-percent-${i}`} className="sr-only">
            نسبة الشريحة
          </label>
          <input
            id={`band-percent-${i}`}
            type="number"
            min={0}
            max={100}
            dir="ltr"
            value={band.percent}
            disabled={disabled}
            onChange={(e) => edit(i, { percent: Number(e.target.value) })}
            className="input input-sm w-20"
          />
          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
            بالمئة
          </span>
          {bands.length > 1 && band.maxSeconds !== null && (
            <button
              type="button"
              onClick={() => onChange(bands.filter((_, j) => j !== i))}
              disabled={disabled}
              aria-label="حذف الشريحة"
              className="shrink-0 disabled:opacity-40"
              style={{ color: "#991b1b" }}
            >
              <Icon name="trash" size={15} />
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addBand}
        disabled={disabled}
        className="text-xs font-bold disabled:opacity-40"
        style={{ color: "var(--mint-700)" }}
      >
        إضافة شريحة
      </button>
    </div>
  );
}
