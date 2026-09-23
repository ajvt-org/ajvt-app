import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { releaseFrom } from "./src/lib/release";

const YEAR = 31536000;

const RENAMED_ON_CHANGE = ["/fonts/:path*"];

const EDITED_IN_PLACE = [
  "/og.png",
  "/icon-192.png",
  "/icon-512.png",
  "/logo-mark.svg",
  "/logo-roundel.svg",
  "/logo-horizontal.svg",
  "/receipt-logo.svg",
  "/receipt-seal.svg",
  "/offline.html",
  "/deploying.html",
];

const ALWAYS_FRESH = ["/sw.js", "/manifest.json"];

function cached(value: string) {
  return (source: string) => ({ source, headers: [{ key: "Cache-Control", value }] });
}

function lastSubject(): string | null {
  try {
    return execSync("git log -1 --format=%s", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.*", "192.168.0.*", "10.0.0.*"],

  env: { RELEASE: releaseFrom(lastSubject(), process.env.RENDER_GIT_COMMIT) },

  async redirects() {
    return [
      {
        source: "/:path((?!api/health$).*)",
        has: [{ type: "host", value: "ajvt-app.onrender.com" }],
        permanent: true,
        destination: "https://ajvt.net/:path",
      },
    ];
  },

  async headers() {
    if (process.env.NODE_ENV !== "production") return [];

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      ...RENAMED_ON_CHANGE.map(cached(`public, max-age=${YEAR}, immutable`)),
      ...EDITED_IN_PLACE.map(cached("public, max-age=0, must-revalidate")),
      ...ALWAYS_FRESH.map(cached("no-cache")),
    ];
  },
};

export default nextConfig;
