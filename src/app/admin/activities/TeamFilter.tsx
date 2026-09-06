"use client";

import { useState } from "react";
import DialogHeader from "@/components/DialogHeader";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import {
  NOTHING_PICKED,
  hasTeamFilter,
  teamFilterSummary,
  toggleNoTeam,
  toggleTeam,
  type TeamSelection,
} from "./registrantFilter";
import { activityRegistrants as texts, filterSheet } from "@/lib/texts";

function Row({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer bg-white">
      <input type="checkbox" checked={on} onChange={onToggle} className="w-4 h-4" />
      <span className="min-w-0 text-sm font-bold" style={{ color: "var(--text-main)" }}>
        {label}
      </span>
    </label>
  );
}

export default function TeamFilter({
  teams,
  selection,
  onChange,
}: {
  teams: { id: string; name: string }[];
  selection: TeamSelection;
  onChange: (next: TeamSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const picked = hasTeamFilter(selection);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={texts.filterByTeam}
        aria-expanded={open}
        className="input input-sm w-full flex items-center justify-between gap-2 text-start"
      >
        <span
          className="truncate"
          style={{ color: picked ? "var(--text-main)" : "var(--text-muted)" }}
        >
          {teamFilterSummary(selection, teams)}
        </span>
        <Icon name="chevronDown" size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
          >
            <DialogHeader title={texts.filterByTeam} onClose={() => setOpen(false)} />
            <div className="p-4 space-y-1.5">
              {teams.map((team) => (
                <Row
                  key={team.id}
                  label={team.name}
                  on={selection.teamIds.includes(team.id)}
                  onToggle={() => onChange(toggleTeam(selection, team.id))}
                />
              ))}
              <Row
                label={texts.noTeam}
                on={selection.noTeam}
                onToggle={() => onChange(toggleNoTeam(selection))}
              />
              <div className="flex items-center gap-2 pt-2">
                {picked && (
                  <button
                    onClick={() => onChange(NOTHING_PICKED)}
                    className="btn btn-sm"
                    style={{
                      background: "white",
                      color: "var(--mint-700)",
                      border: "1px solid var(--mint-100)",
                    }}
                  >
                    <IconLabel name="close">{filterSheet.clear}</IconLabel>
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="btn btn-primary btn-sm">
                  {filterSheet.done}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
