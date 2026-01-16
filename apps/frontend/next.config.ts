import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/tmdb/:path*',
        destination: 'https://api.themoviedb.org/:path*',
      },
    ];
  },

  experimental: {
    proxyTimeout: 120000,
  },
  images: {
    remotePatterns: [
      { hostname: 'image.tmdb.org' },
      { hostname: 'images.tmdb.org' },
      { hostname: 'media.rawg.io' },
      { hostname: 'graph.digiseller.com' },
    ],
  },
  
};

export default nextConfig;
