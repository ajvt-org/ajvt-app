"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { matchAdmin as texts } from "@/lib/texts";

const CHIP = "text-xs px-2.5 py-1.5 rounded-lg font-bold";
const SQUARE = "w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30";

export default function MatchCardActions({
  played,
  football,
  showMvp,
  showDetails,
  onDelete,
  onToggleResultForm,
  onToggleMvp,
  onToggleDetails,
  onMoveUp,
  onMoveDown,
}: {
  played: boolean;
  football: boolean;
  showMvp: boolean;
  showDetails: boolean;
  onDelete: () => void;
  onToggleResultForm: () => void;
  onToggleMvp: () => void;
  onToggleDetails: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const outline = {
    background: "white",
    color: "var(--mint-700)",
    border: "1px solid var(--mint-200)",
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {(onMoveUp || onMoveDown) && (
        <>
          <button
            onClick={onMoveUp}
            disabled={!onMoveUp}
            title={texts.moveUp}
            aria-label={texts.moveUp}
            className={SQUARE}
            style={{ background: "var(--mint-50)", color: "var(--mint-700)" }}
          >
            <Icon name="chevronUp" size={15} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!onMoveDown}
            title={texts.moveDown}
            aria-label={texts.moveDown}
            className={SQUARE}
            style={{ background: "var(--mint-50)", color: "var(--mint-700)" }}
          >
            <Icon name="chevronDown" size={15} />
          </button>
        </>
      )}
      <button
        onClick={onToggleResultForm}
        className={CHIP}
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        {played ? texts.editResult : texts.enterResult}
      </button>
      {football && (
        <button onClick={onToggleMvp} className={CHIP} style={outline}>
          {showMvp ? texts.hideMvp : <IconLabel name="star">{texts.mvpVote}</IconLabel>}
        </button>
      )}
      <button onClick={onToggleDetails} className={CHIP} style={outline}>
        {showDetails ? texts.hideDetails : <IconLabel name="pencil">{texts.editDetails}</IconLabel>}
      </button>
      <button
        onClick={onDelete}
        aria-label={texts.confirmDeleteMatch}
        className={`${CHIP} ms-auto`}
        style={{ background: "#fee2e2", color: "#991b1b" }}
      >
        <Icon name="trash" size={13} />
      </button>
    </div>
  );
}
