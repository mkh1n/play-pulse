import type { NextConfig } from "next";
const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL;

const supabaseHostName =
  supabaseUrl
    ? new URL(
        supabaseUrl,
      ).hostname
    : "";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/tmdb/:path*',
        destination: 'https://api.themoviedb.org/:path*',
      },
    ];
  },
  reactStrictMode: false,
  experimental: {
    proxyTimeout: 120000,
  },
  images: {
    remotePatterns: [
       {
          protocol:
            "https",

          hostname: supabaseHostName,
        },
      {
        protocol: 'https',
        hostname: 'media.rawg.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'graph.digiseller.com',
        port: '',
        pathname: '/**',
      }, {
        protocol: 'https',
        hostname: 'playpulse-rawg-proxy.vercel.app',
        port: '',
        pathname: '/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,

    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

};

export default nextConfig;
