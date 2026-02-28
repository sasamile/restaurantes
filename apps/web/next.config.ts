import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mezzi.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "fincasya.s3.us-east-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
