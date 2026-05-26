/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rycjohhdgvmwzpdqhtrk.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    runtime: 'edge',
  },
}

module.exports = nextConfig
