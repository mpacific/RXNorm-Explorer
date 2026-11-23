import type { NextConfig } from 'next';
import { securityHeaders } from './securityHeaders';

const nextConfig: NextConfig = {
  experimental: {
    webpackMemoryOptimizations: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders({
          apiUrl: process.env.NEXT_PUBLIC_API_URL,
          isDev: process.env.NODE_ENV === 'development',
        }),
      },
    ];
  },
};

export default nextConfig;
