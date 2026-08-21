import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { releaseFrom } from "./src/lib/release";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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

  async headers() {
    if (process.env.NODE_ENV !== "production") return [];

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
