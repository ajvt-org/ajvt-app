import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// An icon inherits currentColor, an emoji keeps its own colours and disappears on a
// tinted background, so the interface draws its icons from Icon.tsx. The files listed
// below are the exceptions: the yellow and red cards, whose colour is the whole
// message, and push notification bodies, which are plain text and cannot carry an SVG.
const EMOJI = "[\\uD83C-\\uDBFF\\u231A-\\u23FA\\u2600-\\u27BF\\u2B00-\\u2BFF\\uFE0F]";
const NO_EMOJI = [
  { selector: `JSXText[value=/${EMOJI}/]`, message: "Use Icon or IconLabel, not an emoji." },
  { selector: `Literal[value=/${EMOJI}/]`, message: "Use Icon or IconLabel, not an emoji." },
  {
    selector: `TemplateElement[value.raw=/${EMOJI}/]`,
    message: "Use Icon or IconLabel, not an emoji.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: { "no-restricted-syntax": ["error", ...NO_EMOJI] },
  },
  {
    files: [
      "src/app/admin/tournament/\\[id\\]/BookingsForm.tsx",
      "src/app/admin/tournament/\\[id\\]/MatchCard.tsx",
      "src/app/admin/tournament/\\[id\\]/ScorersTab.tsx",
      "src/app/admin/tournament/\\[id\\]/constants.ts",
      "src/app/api/admin/activities/\\[id\\]/register/route.ts",
      "src/app/api/admin/matches/\\[matchId\\]/mvp-vote/route.ts",
      "src/app/api/admin/validate/route.ts",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
  ]),
]);

export default eslintConfig;
