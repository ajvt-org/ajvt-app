import type { CSSProperties } from "react";

export interface QuestionTheme {
  variant: "stage" | "arcade";
  screen: CSSProperties;
  questionCard: CSSProperties;
  questionText: CSSProperties;
  hint: CSSProperties;
  option: CSSProperties;
  optionSelected: CSSProperties;
  checkBubble: CSSProperties;
  confirm: CSSProperties;
  locked: CSSProperties;
  timer: {
    ring: boolean;
    track: string;
    full: string;
    falling: string;
    floor: string;
    glow: boolean;
  };
}

export const STAGE: QuestionTheme = {
  variant: "stage",
  screen: { background: "linear-gradient(180deg, var(--mint-900), var(--mint-800))" },
  questionCard: { padding: "18px 6px 4px" },
  questionText: {
    color: "#ffffff",
    fontSize: "1.3rem",
    fontWeight: 900,
    lineHeight: 1.75,
    textAlign: "center",
  },
  hint: { color: "var(--mint-200)" },
  option: {
    background: "rgba(255,255,255,0.96)",
    color: "var(--text-main)",
    border: "2px solid transparent",
    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
  },
  optionSelected: {
    background: "linear-gradient(135deg, var(--copper-500), var(--copper-600))",
    color: "#ffffff",
    border: "2px solid transparent",
    boxShadow: "0 8px 24px rgba(140,74,42,0.45)",
  },
  checkBubble: { background: "rgba(255,255,255,0.25)" },
  confirm: {
    background: "linear-gradient(135deg, var(--mint-500), var(--mint-600))",
    boxShadow: "0 0 24px rgba(74,156,126,0.5)",
  },
  locked: { background: "rgba(255,255,255,0.12)", color: "var(--mint-100)" },
  timer: {
    ring: false,
    track: "rgba(255,255,255,0.12)",
    full: "var(--mint-300)",
    falling: "var(--copper-300)",
    floor: "#fda4af",
    glow: true,
  },
};

export const ARCADE: QuestionTheme = {
  variant: "arcade",
  screen: { background: "var(--mint-50)" },
  questionCard: {
    background: "#ffffff",
    borderRadius: "1.25rem",
    boxShadow: "0 2px 16px rgba(26,63,51,0.08), 0 1px 4px rgba(26,63,51,0.05)",
    padding: "22px 20px",
  },
  questionText: {
    color: "var(--text-main)",
    fontSize: "1.2rem",
    fontWeight: 900,
    lineHeight: 1.7,
    textAlign: "center",
  },
  hint: { color: "var(--text-muted)" },
  option: {
    background: "#ffffff",
    color: "var(--text-main)",
    border: "2px solid var(--mint-100)",
    borderBottom: "5px solid var(--mint-200)",
  },
  optionSelected: {
    background: "linear-gradient(135deg, var(--mint-600), var(--mint-700))",
    color: "#ffffff",
    border: "2px solid var(--mint-700)",
    borderBottom: "5px solid var(--mint-900)",
  },
  checkBubble: { background: "rgba(255,255,255,0.2)" },
  confirm: {
    background: "linear-gradient(135deg, var(--mint-600), var(--mint-700))",
    boxShadow: "0 4px 14px rgba(37,92,73,0.3)",
  },
  locked: { background: "var(--mint-100)", color: "var(--mint-700)" },
  timer: {
    ring: true,
    track: "var(--mint-100)",
    full: "var(--mint-600)",
    falling: "#b45309",
    floor: "#991b1b",
    glow: false,
  },
};

export const QUESTION_THEME: QuestionTheme = STAGE;
