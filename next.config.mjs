import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Optimize for edge runtime
  images: {
    unoptimized: true, // Cloudflare handles image optimization differently
  },
};

// Setup Cloudflare dev platform for local development
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform();
}

export default nextConfig;
