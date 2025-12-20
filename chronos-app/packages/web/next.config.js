/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This is required to make the encryption library work in the browser
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, 
    };
    return config;
  },
};

module.exports = nextConfig;