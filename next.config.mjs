/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Disable image optimization (no internet needed, no external images)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
