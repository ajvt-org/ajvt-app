export const LOGO_MARKS = {
  symbol: "/logo-mark.svg",
  roundel: "/logo-roundel.svg",
} as const;

export type LogoMark = keyof typeof LOGO_MARKS;

export const LOGO_PATHS = Object.values(LOGO_MARKS);
