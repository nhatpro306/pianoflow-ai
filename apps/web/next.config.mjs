import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@pianoflow/shared-types"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "https://rcusueycsj.execute-api.ap-southeast-1.amazonaws.com/api/v1/:path*",
      },
    ];
  },
};

export default withPWA(nextConfig);
