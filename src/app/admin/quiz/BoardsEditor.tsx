"use client";

import Icon from "@/components/Icon";
import NumberField from "@/components/NumberField";
import { MAX_BOARDS, type BoardConfig } from "@/lib/competitionConfig";

export default function BoardsEditor({
  boards,
  disabled,
  shapeLocked = false,
  onChange,
}: {
  boards: BoardConfig[];
  disabled: boolean;
  shapeLocked?: boolean;
  onChange: (boards: BoardConfig[]) => void;
}) {
  function set(index: number, patch: Partial<BoardConfig>) {
    onChange(
      boards.map((board, i) => {
        if (i !== index) return board;
        const next = { ...board, ...patch };
        if (patch.blockRounds !== undefined && next.blockRounds >= 1) {
          next.counting = Math.min(next.counting, next.blockRounds);
        }
        return next;
      }),
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        الترتيبات المعروضة
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        كل ترتيب يظهر للمشارك في لسان خاص به. عدد الجولات هو ما يغطيه الترتيب، والمحتسبة كم جولة
        منها تجمع. الترتيب العام يجمع كل جولات المسابقة فلا يحتاج عدداً.
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
            {!board.wholeRun && (
              <>
                <label className="flex-1 text-xs">
                  <span className="block font-bold mb-1">اسم الفترة</span>
                  <input
                    aria-label={`اسم فترة الترتيب ${index + 1}`}
                    value={board.blockTitle}
                    placeholder="الجولة"
                    disabled={disabled}
                    onChange={(e) => set(index, { blockTitle: e.target.value })}
                    className="input input-sm"
                  />
                </label>
                <label className="flex-1 text-xs">
                  <span className="block font-bold mb-1">الجولات</span>
                  <NumberField
                    min={1}
                    ariaLabel={`جولات الترتيب ${index + 1}`}
                    value={board.blockRounds}
                    disabled={disabled || (shapeLocked && !!board.id)}
                    onChange={(blockRounds) => set(index, { blockRounds })}
                  />
                </label>
                <label className="flex-1 text-xs">
                  <span className="block font-bold mb-1">المحتسبة</span>
                  <NumberField
                    min={1}
                    ariaLabel={`المحتسبة في الترتيب ${index + 1}`}
                    value={board.counting}
                    disabled={disabled || (shapeLocked && !!board.id)}
                    onChange={(counting) => set(index, { counting })}
                  />
                </label>
              </>
            )}
            <label className="flex items-center gap-1.5 text-xs font-bold pb-2">
              <input
                type="checkbox"
                checked={board.wholeRun}
                disabled={disabled || (shapeLocked && !!board.id)}
                onChange={(e) =>
                  set(
                    index,
                    e.target.checked
                      ? { wholeRun: true, blockRounds: 1, counting: 1 }
                      : { wholeRun: false },
                  )
                }
              />
              <span>عام</span>
            </label>
            {board.wholeRun && (
              <span className="text-xs flex-1 pb-2" style={{ color: "var(--text-muted)" }}>
                يجمع كل جولات المسابقة
              </span>
            )}
          </div>
        </div>
      ))}

      {!disabled && boards.length < MAX_BOARDS && (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...boards,
              { title: "", blockTitle: "", blockRounds: 1, counting: 1, wholeRun: false },
            ])
          }
          className="btn btn-sm text-xs"
        >
          إضافة ترتيب
        </button>
      )}
    </div>
  );
}
