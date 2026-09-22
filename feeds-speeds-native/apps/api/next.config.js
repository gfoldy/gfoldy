/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the shared workspace package (it ships as TypeScript source).
  transpilePackages: ['@feedspeed/core'],
};

module.exports = nextConfig;
