export type MatchTone = "light" | "dark";

export const matchTone = {
  light: {
    name: "var(--text-main)",
    score: "var(--mint-700)",
    meta: "var(--text-muted)",
    event: "var(--text-main)",
  },
  dark: {
    name: "#ffffff",
    score: "#ffffff",
    meta: "rgba(255,255,255,0.85)",
    event: "rgba(255,255,255,0.9)",
  },
} as const satisfies Record<MatchTone, Record<string, string>>;
