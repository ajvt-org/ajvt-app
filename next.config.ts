import type { NextConfig } from "next";

// React/Tailwind rely on inline `style="..."` attributes throughout the app,
// so style-src needs 'unsafe-inline' — there's no practical nonce/hash setup
// for per-element inline styles generated at render time. Everything else
// (scripts, connections, frames) stays locked to same-origin.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Allow access from other devices on the local network (for testing from phone)
  allowedDevOrigins: [
    "192.168.0.19",
    "192.168.1.*",
    "192.168.0.*",
    "10.0.0.*",
  ],

  async headers() {
    // Skip in dev: Turbopack's HMR (eval'd chunks, websocket) would trip
    // script-src/connect-src and break local hot reload for no production benefit.
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
