"use client";

import { useState, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/Icon";

// A tournament carries standings, fixtures, squads and a dozen leaderboards.
// Stacked, they made one scroll nobody reached the end of. Each panel is
// rendered on the server and handed over whole, so switching tabs costs no
// request and loses no scroll of the others.
export type TournamentPanel = {
  key: string;
  label: string;
  icon: IconName;
  content: ReactNode;
};

export default function TournamentTabs({ panels }: { panels: TournamentPanel[] }) {
  const [active, setActive] = useState(panels[0]?.key ?? "");
  const current = panels.find((p) => p.key === active) ?? panels[0];

  return (
    <>
      <div className="tournament-tabs" role="tablist">
        {panels.map((panel) => {
          const selected = panel.key === current?.key;
          return (
            <button
              key={panel.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(panel.key)}
              className="tournament-tab"
              style={{
                background: selected ? "var(--mint-700)" : "var(--mint-100)",
                color: selected ? "white" : "var(--mint-700)",
              }}
            >
              <Icon name={panel.icon} size={17} />
              <span className="tournament-tab-label">{panel.label}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="space-y-4">
        {current?.content}
      </div>
    </>
  );
}
