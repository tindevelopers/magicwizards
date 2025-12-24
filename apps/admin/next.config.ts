import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed 'standalone' output for Vercel compatibility
  experimental: {
    serverComponentsExternalPackages: ['openai'],
    optimizePackageImports: [
      "@tinadmin/core",
      "@tinadmin/ui-admin",
      "@heroicons/react",
      "apexcharts",
      "react-apexcharts",
      "@fullcalendar/react",
      "@fullcalendar/core",
      "@fullcalendar/daygrid",
      "@fullcalendar/timegrid",
      "@fullcalendar/list",
      "@fullcalendar/interaction",
      "simplebar-react",
      "swiper",
    ],
  },
  
  // Skip static optimization for problematic pages during build
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // TypeScript configuration - don't fail build on type errors during dev
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Enable compression
  compress: true,
  
  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // Empty config to allow webpack config to work
    // Webpack config will be used when --webpack flag is passed
  },
  
  // Webpack configuration
  webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    
    // Optimize bundle size with aliases for better tree-shaking
    const path = require('path');
    const corePath = path.resolve(__dirname, '../../packages/@tinadmin/core/src');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/core': corePath,
      '@tinadmin/core': corePath,
      '@tinadmin/ui-admin': path.resolve(__dirname, '../../packages/@tinadmin/ui-admin/src'),
      '@tinadmin/config': path.resolve(__dirname, '../../packages/@tinadmin/config/src'),
    };
    
    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    return config;
  },
  
  // Headers for security and caching
  async headers() {
    return [
      {
        // Security headers for all routes
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Cache headers for static assets
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
