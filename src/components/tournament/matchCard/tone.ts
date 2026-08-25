export type MatchTone = "light" | "dark";

export const matchTone = {
  light: {
    name: "var(--text-main)",
    score: "var(--mint-700)",
    meta: "var(--text-muted)",
    event: "var(--text-main)",
    rule: "var(--mint-100)",
    muted: "var(--text-muted)",
  },
  dark: {
    name: "#ffffff",
    score: "#ffffff",
    meta: "rgba(255,255,255,0.85)",
    event: "rgba(255,255,255,0.9)",
    rule: "rgba(255,255,255,0.2)",
    muted: "rgba(255,255,255,0.7)",
  },
} as const satisfies Record<MatchTone, Record<string, string>>;
