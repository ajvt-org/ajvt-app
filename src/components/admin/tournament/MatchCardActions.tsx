"use client";

import IconLabel from "@/components/IconLabel";
import { matchAdmin as texts } from "@/lib/texts";

const CHIP = "text-xs px-2.5 py-1.5 rounded-lg font-bold";
export const SQUARE = "w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30";
export const EVENT_ROW = "flex items-center justify-between gap-2 text-xs rounded-lg";
export const EVENT_ROW_TEXT = "flex items-center gap-1.5 min-w-0";
export const EVENT_ROW_ACTIONS = "flex items-center gap-2 shrink-0";

export default function MatchCardActions({
  played,
  decided,
  resultAllowed,
  football,
  showMvp,
  showDetails,
  onDelete,
  onToggleResultForm,
  onToggleMvp,
  onToggleDetails,
}: {
  played: boolean;
  decided: boolean;
  resultAllowed: boolean;
  football: boolean;
  showMvp: boolean;
  showDetails: boolean;
  onDelete: () => void;
  onToggleResultForm: () => void;
  onToggleMvp: () => void;
  onToggleDetails: () => void;
}) {
  const outline = {
    background: "white",
    color: "var(--mint-700)",
    border: "1px solid var(--mint-200)",
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {decided && (
          <button
            onClick={onToggleResultForm}
            disabled={!resultAllowed}
            className={`${CHIP} disabled:opacity-40`}
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {played ? texts.editResult : texts.enterResult}
          </button>
        )}
        {decided && football && (
          <button onClick={onToggleMvp} className={CHIP} style={outline}>
            {showMvp ? texts.hideMvp : <IconLabel name="star">{texts.mvpVote}</IconLabel>}
          </button>
        )}
        <button onClick={onToggleDetails} className={CHIP} style={outline}>
          {showDetails ? (
            texts.hideDetails
          ) : (
            <IconLabel name="pencil">{texts.editDetails}</IconLabel>
          )}
        </button>
      </div>

      <div className="flex justify-end pt-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
        <button
          onClick={onDelete}
          aria-label={texts.confirmDeleteMatch}
          className={CHIP}
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="trash">{texts.remove}</IconLabel>
        </button>
      </div>
    </div>
  );
}
