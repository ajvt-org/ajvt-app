"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import type { RosterMember } from "./types";
import { teamsTab } from "@/lib/texts";

export default function AddPlayerRow({
  candidates,
  busy,
  onAddMember,
}: {
  candidates: RosterMember[];
  busy: boolean;
  onAddMember: (userId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState("");

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="text-xs px-3 py-1.5 rounded-lg font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        <IconLabel name="plus">{teamsTab.addPlayer}</IconLabel>
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        value={picked}
        onChange={(e) => setPicked(e.target.value)}
        aria-label={teamsTab.addPlayer}
        className="input flex-1"
      >
        <option value="">{teamsTab.pickPlayer}</option>
        {candidates.map((m) => (
          <option key={m.id} value={m.id}>
            {m.fullName}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          onAddMember(picked);
          setPicked("");
          setAdding(false);
        }}
        disabled={!picked || busy}
        className="btn btn-primary text-xs px-3"
        style={{ width: "auto" }}
      >
        {teamsTab.add}
      </button>
    </div>
  );
}
