// Stroke icons on a 24x24 viewBox. Unlike an emoji, a viewBox has no baseline
// or side bearings, so the glyph sits exactly in the middle of a round button
// instead of a little low and to one side.
const PATHS = {
  shield: "M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6l7-3z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  refresh: "M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6",
  close: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  chevronDown: "M6 9l6 6 6-6",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14",
  pencil: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z",
  chevronRight: "M9 18l6-6-6-6",
  chevronLeft: "M15 18l-6-6 6-6",
  chevronUp: "M18 15l-6-6-6 6",
  key: "M14 7a5 5 0 1 1-4.9 6L7 15H5v2H3v2H1v-3l8.1-8.1A5 5 0 0 1 14 7zM16 10h.01",
  lock: "M5 11h14v10H5V11zM8 11V7a4 4 0 0 1 8 0v4",
  save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  chat: "M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 4 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 8.4z",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  tag: "M20.6 13.4L12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01",
  chart: "M3 21h18M7 21v-8M12 21V5M17 21v-11",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  megaphone:
    "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6M12 14v6",
  receipt: "M5 21V3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6",
  banknote: "M2 6h20v12H2V6zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 9h.01M19 15h.01",
  card: "M2 6h20v12H2V6zM2 10h20M6 15h3",
  heart: "M12 20S3.5 14.5 3.5 8.8A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.5 2.8C20.5 14.5 12 20 12 20z",
  phone:
    "M21 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 4.2 2 2 0 0 1 3.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.8.7 2.7a2 2 0 0 1-.5 2.1L7.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  ban: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8",
  idCard:
    "M2 5h20v14H2V5zM8 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M15 10h4M15 14h4",
  file: "M14 2H6v20h12V6l-4-4zM14 2v4h4",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  camera: "M3 7h3l2-2h8l2 2h3v13H3V7zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  image: "M3 4h18v16H3V4zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 20",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  quiz: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.1 9.5a3 3 0 0 1 5.8 1c0 2-2.9 2.5-2.9 4M12 17.5h.01",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7.3 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.3 13H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.5 6.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.8H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  calendar: "M3 5h18v16H3V5zM3 10h18M8 3v4M16 3v4",
  flag: "M4 22V3h11l-1 3h6l-2 5 2 5h-9l-1-3H4",
  warning: "M12 3l9.5 17H2.5L12 3zM12 10v4M12 17.5h.01",
  handshake:
    "M12 7l-2-2a2.8 2.8 0 0 0-4 0L2 9l4 4M12 7l2-2a2.8 2.8 0 0 1 4 0l4 4-4 4M12 7l-3 3a1.5 1.5 0 0 0 2 2l2-2 2 2a1.5 1.5 0 0 0 2-2",
  ball: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8l3.5 2.5-1.3 4h-4.4l-1.3-4L12 8zM12 3v5M3.5 9.5L8.8 12M20.5 9.5L15.2 12M6.5 19l3.3-4.5M17.5 19l-3.3-4.5",
  wallet: "M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3V7zM3 7V5h13M17 13h.01",
  contact:
    "M4 3h16v18H4V3zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 17c.8-1.7 2.2-2.5 4-2.5s3.2.8 4 2.5",
  target:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
