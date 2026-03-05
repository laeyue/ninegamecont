/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Disable image optimization (no internet needed, no external images)
  images: {
    unoptimized: true,
  },
  // Ensure pg + prisma are properly included in standalone build
  experimental: {
    serverComponentsExternalPackages: ["pg", "@prisma/client", "@prisma/adapter-pg"],
  },
};

export default nextConfig;
