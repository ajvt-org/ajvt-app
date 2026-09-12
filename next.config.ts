import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { releaseFrom } from "./src/lib/release";

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
    ];
  },
};

export default nextConfig;
