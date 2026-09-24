/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'fra.cloud.appwrite.io',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '16mb',
    },
  },
  async headers() {
    return [
      {
        source: "/api/sdk/:path*",
        headers: [
          // No credentials needed for public SDK endpoints; omit Access-Control-Allow-Credentials.
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      },
      {
        source: "/embed/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "xr-spatial-tracking=(self), accelerometer=(self), gyroscope=(self)" },
        ]
      }
    ];
  }
};

export default nextConfig;
