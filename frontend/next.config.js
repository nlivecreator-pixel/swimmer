/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Support both localhost (dev) and Replit (BACKEND_URL env)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      { source: '/api/:path*',     destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
      { source: '/ws/:path*',      destination: `${backendUrl}/ws/:path*` },
    ];
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [{ protocol: 'https', hostname: '**.replit.dev' }],
  },
  env: {
    NEXT_PUBLIC_WS_URL:  process.env.WS_URL      || 'ws://localhost:8000',
    NEXT_PUBLIC_API_URL: process.env.BACKEND_URL  || 'http://localhost:8000',
  },
}
module.exports = nextConfig
