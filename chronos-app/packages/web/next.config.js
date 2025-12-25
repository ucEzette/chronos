/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // 1. Fixes the "Module not found" errors for fs, net, tls
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false 
    };
    
    // 2. Fixes the "Async Storage" and React Native warnings from MetaMask
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': 'react-native-web',
      '@react-native-async-storage/async-storage': false, 
    };

    // 3. Prevents other wallet connector library errors
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    return config;
  },
};

module.exports = nextConfig;