/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
