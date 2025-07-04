/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude Supabase Edge Functions from Next.js compilation
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    return config
  },
  // Ignore Edge Functions directory
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  transpilePackages: [],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Removed old domain rewrites - no longer needed
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 