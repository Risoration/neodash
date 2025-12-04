/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Suppress warnings for optional dynamic imports
    config.ignoreWarnings = [{ module: /plaid/ }];
    return config;
  },
};

export default nextConfig;
