/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Suppress warnings for optional dynamic imports
    config.ignoreWarnings = [{ module: /plaid/ }];
    return config;
  },
  // Turbopack configuration (empty for now, webpack config above handles plaid warnings)
  turbopack: {},
};

export default nextConfig;
