"use client";

import Icon from "@/components/Icon";
import { MAX_BOARDS, type BoardConfig } from "@/lib/competitionConfig";

export default function BoardsEditor({
  boards,
  disabled,
  onChange,
}: {
  boards: BoardConfig[];
  disabled: boolean;
  onChange: (boards: BoardConfig[]) => void;
}) {
  function set(index: number, patch: Partial<BoardConfig>) {
    onChange(boards.map((board, i) => (i === index ? { ...board, ...patch } : board)));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        الترتيبات المعروضة
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        كل ترتيب يظهر للمشارك في لسان خاص به. عدد الجولات هو ما يغطيه الترتيب، والمحتسبة كم جولة
        منها تجمع، والعام يجمع كل الفترات بدل الفترة الجارية.
      </p>

      {boards.map((board, index) => (
        <div
          key={index}
          className="rounded-lg p-2 space-y-2"
          style={{ background: "var(--surface-2)" }}
        >
          <div className="flex gap-2 items-center">
            <input
              aria-label={`عنوان الترتيب ${index + 1}`}
              value={board.title}
              disabled={disabled}
              onChange={(e) => set(index, { title: e.target.value })}
              className="input input-sm"
            />
            {!disabled && boards.length > 1 && (
              <button
                type="button"
                aria-label={`حذف الترتيب ${index + 1}`}
                onClick={() => onChange(boards.filter((_, i) => i !== index))}
                className="btn btn-icon btn-sm"
                style={{ color: "#991b1b" }}
              >
                <Icon name="trash" size={13} />
              </button>
            )}
          </div>

          <div className="flex gap-2 items-end">
            <label className="flex-1 text-xs">
              <span className="block font-bold mb-1">الجولات</span>
              <input
                type="number"
                min={1}
                dir="ltr"
                aria-label={`جولات الترتيب ${index + 1}`}
                value={board.blockRounds}
                disabled={disabled}
                onChange={(e) => set(index, { blockRounds: Number(e.target.value) })}
                className="input input-sm"
              />
            </label>
            <label className="flex-1 text-xs">
              <span className="block font-bold mb-1">المحتسبة</span>
              <input
                type="number"
                min={1}
                dir="ltr"
                aria-label={`المحتسبة في الترتيب ${index + 1}`}
                value={board.counting}
                disabled={disabled}
                onChange={(e) => set(index, { counting: Number(e.target.value) })}
                className="input input-sm"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold pb-2">
              <input
                type="checkbox"
                checked={board.wholeRun}
                disabled={disabled}
                onChange={(e) => set(index, { wholeRun: e.target.checked })}
              />
              <span>عام</span>
            </label>
          </div>
        </div>
      ))}

      {!disabled && boards.length < MAX_BOARDS && (
        <button
          type="button"
          onClick={() =>
            onChange([...boards, { title: "", blockRounds: 1, counting: 1, wholeRun: false }])
          }
          className="btn btn-sm text-xs"
        >
          إضافة ترتيب
        </button>
      )}
    </div>
  );
}
