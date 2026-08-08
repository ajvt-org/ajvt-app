import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow access from other devices on the local network (for testing from phone)
  allowedDevOrigins: [
    "192.168.0.19",
    "192.168.1.*",
    "192.168.0.*",
    "10.0.0.*",
  ],
};

export default nextConfig;
