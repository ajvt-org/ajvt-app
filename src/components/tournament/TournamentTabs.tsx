"use client";

import { useState, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/Icon";

// A tournament carries standings, fixtures, squads and a dozen leaderboards.
// Stacked, they made one scroll nobody reached the end of. Each panel is
// rendered on the server and handed over whole, so switching tabs costs no
// request.
//
// A panel is mounted the first time it is opened and hidden rather than
// dropped thereafter, so what a reader did inside it — which sub-tab they
// picked, how far down a list they paged — is still there when they come
// back. Panels never opened are never mounted, which keeps the work the
// browser does proportional to what was actually read.
export type TournamentPanel = {
  key: string;
  label: string;
  icon: IconName;
  content: ReactNode;
};

export default function TournamentTabs({
  panels,
  variant = "top",
}: {
  panels: TournamentPanel[];
  variant?: "top" | "sub";
}) {
  const first = panels[0]?.key ?? "";
  const [active, setActive] = useState(first);
  const [opened, setOpened] = useState<string[]>([first]);
  const current = panels.find((p) => p.key === active) ?? panels[0];
  const sub = variant === "sub";

  function open(key: string) {
    setActive(key);
    setOpened((seen) => (seen.includes(key) ? seen : [...seen, key]));
  }

  return (
    <>
      <div className={sub ? "tournament-subtabs" : "tournament-tabs"} role="tablist">
        {panels.map((panel) => {
          const selected = panel.key === current?.key;
          return (
            <button
              key={panel.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => open(panel.key)}
              className={sub ? "tournament-subtab" : "tournament-tab"}
              style={{
                background: selected ? "var(--mint-700)" : "var(--mint-100)",
                color: selected ? "white" : "var(--mint-700)",
              }}
            >
              <Icon name={panel.icon} size={sub ? 14 : 17} />
              <span className={sub ? undefined : "tournament-tab-label"}>{panel.label}</span>
            </button>
          );
        })}
      </div>

      {panels
        .filter((panel) => opened.includes(panel.key))
        .map((panel) => (
          <div
            key={panel.key}
            role="tabpanel"
            hidden={panel.key !== current?.key}
            className="space-y-4"
          >
            {panel.content}
          </div>
        ))}
    </>
  );
}
