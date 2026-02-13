/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude src/ (Koa backend) from Next.js compilation
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
