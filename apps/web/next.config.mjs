import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@pianoflow/shared-types"],
};

export default withPWA(nextConfig);
